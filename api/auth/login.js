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
    const { createUser, getUserByEmail } = await import('../../lib/database.js');
    const { signJWT } = await import('../../lib/jwt.js');

    const { email, googleId, name, tier = 'trial', ghlContactId, stripeCustomerId } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Determine whether this is a returning user BEFORE applying strict GHL gating.
    // Returning users may legitimately exist in Supabase even if GHL search fails or the CRM
    // contact was never created/synced. Blocking them with USER_NOT_FOUND_IN_GHL breaks logout/login.
    let user = await getUserByEmail(email);
    const isReturningUser = !!user;

    // GHL validation / tier hints (best-effort for returning users; strict for brand-new users)
    let validatedTier = isReturningUser ? (user.tier || tier) : tier;
    let ghlResult = null;
    try {
      console.log('🔍 Validating user in GHL before login:', email);
      ghlResult = await validateUserTierDirect(email);

      if (ghlResult?.contactId) {
        console.log('✅ GHL validation passed:', { email, tier: ghlResult.tier, contactId: ghlResult.contactId });
        validatedTier = ghlResult.tier || validatedTier;
      } else if (!isReturningUser) {
        console.log('❌ User not found in GHL system (new user):', email);
        return res.status(403).json({
          success: false,
          code: 'USER_NOT_FOUND_IN_GHL',
          message: 'No active plan found. Please choose a plan to continue.',
          redirect: '/#signup'
        });
      } else {
        console.warn('⚠️ GHL returned no contact for returning user; continuing with DB tier:', {
          email,
          tier: validatedTier
        });
      }
    } catch (ghlError) {
      console.error('❌ GHL validation error:', ghlError);
      if (!isReturningUser) {
        // For new users: GHL API error = redirect to signup (fail-closed)
        // They need to go through signup flow to establish GHL contact first
        return res.status(403).json({
          success: false,
          code: 'USER_NOT_FOUND_IN_GHL',
          message: 'Unable to verify your account. Please choose a plan to continue.',
          redirect: '/#signup'
        });
      }

      console.warn('⚠️ GHL verification failed for returning user; continuing with DB tier:', {
        email,
        tier: validatedTier
      });
    }

    if (!user) {
      // NEW USERS: Only create if GHL validation succeeded
      if (!ghlResult?.contactId) {
        // This should not happen - GHL validation should have returned 403/503 above
        console.error('❌ CRITICAL: New user reached creation without GHL validation:', email);
        return res.status(403).json({
          success: false,
          code: 'USER_NOT_FOUND_IN_GHL',
          message: 'No active plan found. Please choose a plan to continue.',
          redirect: '/#signup'
        });
      }

      const nameParts = name ? name.split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      user = await createUser({
        email,
        tier: validatedTier
        // Skip googleId and other optional fields for schema compatibility
      });

      console.log('✅ Created new user after GHL validation:', { email, tier: validatedTier, ghlContactId: ghlResult.contactId });
    } else {
      // For existing user, use as-is without attempting database updates
      // This avoids schema compatibility issues
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
