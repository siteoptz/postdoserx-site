import { setCorsHeaders } from '../../lib/cors.js';
import { getUserByEmail } from '../../lib/database.js';
import {
  fetchGhlContactEntitlement,
  marketingAccountEligibleForLogin,
  marketingTierHint
} from '../../lib/auth-entitlement.js';

/**
 * POST { email } — "Would /api/auth/login allow this person?" for marketing (modal email step).
 * Uses the same Supabase + GHL rules as login, so DB-provisioned users are not sent to signup
 * when GHL tags are missing or lagging.
 */
export default async function handler(req, res) {
  setCorsHeaders(req, res, { methods: 'POST, OPTIONS' });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email: raw } = req.body || {};
    if (!raw || typeof raw !== 'string' || !raw.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const email = raw.trim();

    let user = null;
    try {
      user = await getUserByEmail(email);
    } catch (dbError) {
      console.error('check-account DB:', dbError);
      return res.status(500).json({ success: false, error: 'Lookup failed' });
    }

    let ghlResult = null;
    let ghlFailed = false;
    try {
      ghlResult = await fetchGhlContactEntitlement(email);
    } catch (ghlError) {
      ghlFailed = true;
      console.error('check-account GHL:', ghlError);
    }

    const exists = marketingAccountEligibleForLogin({ user, ghlResult, ghlFailed });
    const tier = marketingTierHint({ user, ghlResult });

    return res.status(200).json({
      success: true,
      data: {
        exists,
        tier: exists ? tier : 'trial'
      }
    });
  } catch (error) {
    console.error('check-account error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
