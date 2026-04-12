import { getUserById, updateUser, createOrUpdateUserProfile } from '../../lib/database.js';
import { withAuth } from '../../lib/jwt.js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://app.postdoserx.com,https://postdoserx.com' 
    : '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

async function handler(req, res) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader(corsHeaders);
    return res.status(200).end();
  }

  const userId = req.user.userId;

  if (req.method === 'GET') {
    try {
      const user = await getUserById(userId);
      
      if (!user) {
        res.setHeader(corsHeaders);
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.setHeader(corsHeaders);
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            tier: user.tier,
            subscriptionStatus: user.subscription_status,
            createdAt: user.created_at
          },
          profile: user.user_profiles?.[0] || null
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.setHeader(corsHeaders);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        // User fields
        tier,
        
        // Profile fields
        firstName,
        lastName,
        medication,
        dose,
        injectionDay,
        startWeight,
        goalWeight,
        goals,
        dietaryPreferences,
        allergies,
        notificationPreferences,
        onboardingCompleted
      } = req.body;

      // Update user fields if provided
      if (tier) {
        await updateUser(userId, { tier });
      }

      // Update/create profile
      const profileData = {};
      if (firstName !== undefined) profileData.first_name = firstName;
      if (lastName !== undefined) profileData.last_name = lastName;
      if (medication !== undefined) profileData.medication = medication;
      if (dose !== undefined) profileData.dose = dose;
      if (injectionDay !== undefined) profileData.injection_day = injectionDay;
      if (startWeight !== undefined) profileData.start_weight = startWeight;
      if (goalWeight !== undefined) profileData.goal_weight = goalWeight;
      if (goals !== undefined) profileData.goals = goals;
      if (dietaryPreferences !== undefined) profileData.dietary_preferences = dietaryPreferences;
      if (allergies !== undefined) profileData.allergies = allergies;
      if (notificationPreferences !== undefined) profileData.notification_preferences = notificationPreferences;
      if (onboardingCompleted !== undefined) profileData.onboarding_completed = onboardingCompleted;

      if (Object.keys(profileData).length > 0) {
        await createOrUpdateUserProfile(userId, profileData);
      }

      // Return updated data
      const updatedUser = await getUserById(userId);

      res.setHeader(corsHeaders);
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            tier: updatedUser.tier,
            subscriptionStatus: updatedUser.subscription_status,
            createdAt: updatedUser.created_at
          },
          profile: updatedUser.user_profiles?.[0] || null
        }
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.setHeader(corsHeaders);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  res.setHeader(corsHeaders);
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}

export default withAuth(handler);