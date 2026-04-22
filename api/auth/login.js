import { setCorsHeaders } from '../../lib/cors.js';

// GHL Integration constants (keep server-side only)
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_KEY = process.env.GHL_API_KEY || 'pit-e2c103d1-89c7-4e4a-9376-e3b50257d66b';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'ECu5ScdYFmB0WnhvYoBU';

// Server-side GHL validation function
async function validateUserTierDirect(email) {
  const url = `${GHL_API_BASE}/contacts/search?email=${encodeURIComponent(email)}&locationId=${GHL_LOCATION_ID}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  });

  if (!response.ok) {
    throw new Error(`GHL Search Error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.contacts || data.contacts.length === 0) {
    // User not found in GHL - return null to trigger redirect to signup
    return null;
  }

  const contact = data.contacts[0];
  const tags = contact.tags || [];

  // IMPORTANT:
  // A raw CRM "contact" is NOT sufficient to grant app access. Marketing funnels can create
  // contacts without an actual PostDose plan selection. Require PostDose-specific tag(s).
  const hasPostDoseTag = tags.some((t) => String(t).toLowerCase().includes('postdoserx'));
  if (!hasPostDoseTag) {
    console.log('🚫 GHL contact exists but is not a PostDose contact (missing postdoserx tag). Treating as not entitled.');
    return null;
  }
  
  // Determine tier from tags
  let tier = 'trial'; // default
  if (tags.some(tag => tag.includes('premium') || tag.includes('paid'))) {
    tier = 'premium';
  } else if (tags.some(tag => tag.includes('trial'))) {
    tier = 'trial';
  }

  return {
    tier,
    contactId: contact.id,
    tags: tags,
    customFields: contact.customFields || {}
  };
}

function isProvisionedUser(user) {
  if (!user) return false;
  // A bare users row is NOT proof the user completed CRM/plan gating.
  // `createUser()` uses upsert-on-email and can create "partial" rows.
  if (user.ghl_contact_id) return true;
  const status = (user.subscription_status || '').toLowerCase();
  if (['active', 'trialing', 'paid', 'past_due'].includes(status)) return true;
  return false;
}

/**
 * Auth login — load DB/JWT only on POST so OPTIONS preflight never 500s from missing env at import time.
 */
export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { createUser, getUserByEmail, updateUser } = await import('../../lib/database.js');
    const { signJWT } = await import('../../lib/jwt.js');

    // Intentionally ignore request body `tier` for authorization decisions (clients must not self-upgrade)
    const { email, googleId, name, tier: _clientTierIgnored, ghlContactId, stripeCustomerId } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    let user = await getUserByEmail(email);
    const provisionedBefore = isProvisionedUser(user);

    // Always attempt a CRM contact lookup. Used for gating, tier hints, and repairing missing CRM IDs.
    let ghlResult = null;
    let ghlFailed = false;
    try {
      console.log('🔍 GHL contact lookup for login:', email);
      ghlResult = await validateUserTierDirect(email);
    } catch (ghlError) {
      ghlFailed = true;
      console.error('❌ GHL lookup error:', ghlError);
    }

    // If we can find a CRM contact for a "partial" DB user, repair missing ghl_contact_id.
    if (user && !provisionedBefore && ghlResult?.contactId) {
      try {
        const repaired = await updateUser(user.id, {
          ghl_contact_id: ghlResult.contactId,
          // Prefer CRM-derived tier for users who were created without gating metadata
          tier: ghlResult.tier || user.tier
        });
        user = { ...user, ...repaired };
      } catch (repairError) {
        console.error('❌ Failed to repair user with GHL contact id:', repairError);
        return res.status(500).json({ success: false, error: 'Failed to repair account' });
      }
    }

    const provisioned = isProvisionedUser(user);
    
    // CRITICAL: Always re-validate GHL access, even for provisioned users
    // Database flags can be stale; user might have lost access or changed plans
    if (!ghlFailed && !ghlResult?.contactId) {
      return res.status(403).json({
        success: false,
        code: 'USER_NOT_FOUND_IN_GHL',
        message: 'No active plan found. Please choose a plan to continue.',
        redirect: '/#signup'
      });
    }

    // If CRM is unavailable, allow provisioned users but block new users
    if (ghlFailed) {
      if (!provisioned) {
        return res.status(503).json({
          success: false,
          code: 'GHL_VERIFICATION_UNAVAILABLE',
          message: 'We could not verify your account right now. Please try again in a few minutes.',
          retryable: true
        });
      }
      // Provisioned users can proceed if GHL is down (graceful degradation)
      console.warn('⚠️ GHL unavailable but allowing provisioned user:', user.email);
    }

    // Tier for JWT: prefer DB if provisioned, else CRM, else safe default
    let validatedTier = provisioned
      ? (ghlResult?.tier || user.tier || 'trial')
      : (ghlResult?.tier || 'trial');

    if (!user) {
      // If there is no DB row, only create one when CRM can prove a contact exists.
      // (This is NOT the "pick a plan" marketing path; that should create rows via webhooks/flows.)
      if (!ghlResult?.contactId) {
        // Should be unreachable if !provisioned handled above, but keep fail-closed
        return res.status(403).json({
          success: false,
          code: 'USER_NOT_FOUND_IN_GHL',
          message: 'No active plan found. Please choose a plan to continue.',
          redirect: '/#signup'
        });
      }

      user = await createUser({
        email,
        googleId: googleId || null,
        tier: validatedTier,
        ghlContactId: ghlResult.contactId,
        stripeCustomerId: stripeCustomerId || null
      });
    } else {
      // Existing DB users: do not use createUser/upsert here; optional tier alignment could be added later
    }

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      tier: validatedTier,
      iat: Math.floor(Date.now() / 1000)
    });

    res.setHeader('Set-Cookie', [
      `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
    ]);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          tier: validatedTier,
          profile: user.user_profiles?.[0] || null
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
