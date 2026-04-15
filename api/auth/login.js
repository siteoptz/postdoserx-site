import { setCorsHeaders } from '../../lib/cors.js';

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

    let user = await getUserByEmail(email);

    if (!user) {
      const nameParts = name ? name.split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      user = await createUser({
        email,
        googleId,
        tier,
        ghlContactId,
        stripeCustomerId
      });

      if (firstName) {
        const { createOrUpdateUserProfile } = await import('../../lib/database.js');
        await createOrUpdateUserProfile(user.id, {
          first_name: firstName,
          last_name: lastName
        });
      }
    } else {
      const updates = {};
      if (googleId && !user.google_id) {
        updates.google_id = googleId;
      }
      if (tier !== user.tier) {
        updates.tier = tier;
      }
      if (ghlContactId && !user.ghl_contact_id) {
        updates.ghl_contact_id = ghlContactId;
      }
      if (stripeCustomerId && !user.stripe_customer_id) {
        updates.stripe_customer_id = stripeCustomerId;
      }

      if (Object.keys(updates).length > 0) {
        const { updateUser } = await import('../../lib/database.js');
        user = await updateUser(user.id, updates);
      }
    }

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      tier: user.tier,
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
          tier: user.tier,
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
