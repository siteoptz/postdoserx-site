import { getUserById } from '../../lib/database.js';
import { authenticateRequest } from '../../lib/jwt.js';
import { validateAuthMeRequest } from '../../lib/api-request-validation.js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for now to debug
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

export default async function handler(req, res) {
  // Set CORS headers for all requests
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const inputValidation = validateAuthMeRequest(req);
  if (!inputValidation.ok) {
    return res.status(inputValidation.status).json({
      success: false,
      error: inputValidation.error
    });
  }

  try {
    // Authenticate request and get user payload
    const payload = await authenticateRequest(req);
    
    // Get fresh user data from database
    const user = await getUserById(payload.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          tier: user.tier,
          subscriptionStatus: user.subscription_status,
          createdAt: user.created_at,
          profile: user.user_profiles?.[0] || null
        }
      }
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    
    // Return 401 for authentication errors
    return res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
}