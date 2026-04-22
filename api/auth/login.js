import { setCorsHeaders } from '../../lib/cors.js';
import {
  fetchGhlContactEntitlement,
  isProvisionedUser,
  isDbSubscriptionEntitled
} from '../../lib/auth-entitlement.js';

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
      ghlResult = await fetchGhlContactEntitlement(email);
    } catch (ghlError) {
      ghlFailed = true;
      console.error('❌ GHL lookup error:', ghlError);
    }

    // If we can find an entitled CRM contact for a "partial" DB user, repair missing ghl_contact_id.
    if (user && !provisionedBefore && ghlResult?.contactId && ghlResult.qualified) {
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
    const dbEntitled = isDbSubscriptionEntitled(user);

    // Reconcile CRM vs DB:
    // - A raw LeadConnector lead is not PostDose entitlement.
    // - A Stripe/DB subscription can still be authoritative if CRM tags lag.
    if (!ghlFailed) {
      if (!ghlResult || !ghlResult.contactId) {
        if (!provisioned && !dbEntitled) {
          return res.status(403).json({
            success: false,
            code: 'USER_NOT_FOUND_IN_GHL',
            message: 'No active plan found. Please choose a plan to continue.',
            redirect: '/#signup'
          });
        }
      } else if (!ghlResult.qualified) {
        if (!provisioned && !dbEntitled) {
          return res.status(403).json({
            success: false,
            code: 'USER_NOT_FOUND_IN_GHL',
            message:
              'We found this email in our system, but it is not linked to an active PostDose plan. Please continue signup to select a plan.',
            redirect: '/#signup'
          });
        }
      }
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
      // If there is no DB row, only create one when CRM can prove PostDose entitlement.
      if (!ghlResult?.contactId || !ghlResult.qualified) {
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
