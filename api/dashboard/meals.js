import { supabase } from '../../lib/database.js';
import { verifyJWT } from '../../lib/jwt.js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    // Get and verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    let payload;
    
    try {
      payload = await verifyJWT(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const userId = payload.userId;

    if (req.method === 'GET') {
      return await getMealPlans(req, res, userId);
    } else if (req.method === 'POST') {
      return await rateMeal(req, res, userId);
    }

    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });

  } catch (error) {
    console.error('Meals API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

async function getMealPlans(req, res, userId) {
  const { week } = req.query;
  
  let weekStartDate;
  if (week) {
    weekStartDate = week;
  } else {
    // Default to current week
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    weekStartDate = startOfWeek.toISOString().split('T')[0];
  }

  const { data: mealPlan, error: mealError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .single();

  const { data: groceryList, error: groceryError } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .single();

  if (mealError && mealError.code !== 'PGRST116') {
    console.error('Failed to fetch meal plan:', mealError);
  }

  if (groceryError && groceryError.code !== 'PGRST116') {
    console.error('Failed to fetch grocery list:', groceryError);
  }

  // If no meal plan exists, generate a basic one
  if (!mealPlan) {
    const generatedPlan = await generateBasicMealPlan(userId);
    return res.status(200).json({
      success: true,
      data: {
        mealPlan: generatedPlan,
        groceryList: null,
        weekStartDate: weekStartDate
      }
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      mealPlan: mealPlan || null,
      groceryList: groceryList || null,
      weekStartDate: weekStartDate
    }
  });
}

async function rateMeal(req, res, userId) {
  const { sessionDate, mealType, rating, feedback } = req.body;

  if (!sessionDate || !mealType || !rating) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: sessionDate, mealType, rating'
    });
  }

  // Get existing ratings for the day
  const { data: existingRating } = await supabase
    .from('meal_ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', sessionDate)
    .single();

  const ratings = existingRating ? existingRating.ratings : {};
  const feedbackData = existingRating ? existingRating.feedback : {};

  // Update the specific meal rating
  ratings[mealType] = rating;
  if (feedback) {
    feedbackData[mealType] = feedback;
  }

  const { data, error } = await supabase
    .from('meal_ratings')
    .upsert({
      user_id: userId,
      session_date: sessionDate,
      ratings: ratings,
      feedback: feedbackData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,session_date'
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to rate meal:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to rate meal'
    });
  }

  return res.status(200).json({
    success: true,
    data: data
  });
}

async function generateBasicMealPlan(userId) {
  // Get user profile to customize plan
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  const injectionDay = profile?.injection_day || 0; // Default to Sunday
  
  // Generate a basic 7-day meal plan
  const basicPlan = {
    plan_data: {
      sunday: {
        isInjectionDay: injectionDay === 0,
        breakfast: {
          name: "Gentle Oatmeal Bowl",
          description: "Steel-cut oats with banana and cinnamon",
          calories: 320,
          protein: 8
        },
        lunch: {
          name: "Light Chicken Soup",
          description: "Clear broth with tender chicken and vegetables",
          calories: 280,
          protein: 25
        },
        dinner: {
          name: "Baked Salmon with Rice",
          description: "Mild salmon with jasmine rice and steamed broccoli",
          calories: 420,
          protein: 30
        }
      },
      monday: {
        isInjectionDay: injectionDay === 1,
        breakfast: {
          name: "Greek Yogurt Parfait",
          description: "Plain yogurt with berries and granola",
          calories: 290,
          protein: 15
        },
        lunch: {
          name: "Turkey and Rice Bowl",
          description: "Lean turkey with brown rice and carrots",
          calories: 350,
          protein: 28
        },
        dinner: {
          name: "Grilled Chicken Breast",
          description: "Herb-seasoned chicken with sweet potato",
          calories: 380,
          protein: 32
        }
      },
      // Continue with other days...
      tuesday: {
        isInjectionDay: injectionDay === 2,
        breakfast: {
          name: "Banana Toast",
          description: "Whole grain toast with banana slices",
          calories: 250,
          protein: 6
        },
        lunch: {
          name: "Quinoa Salad",
          description: "Quinoa with cucumber and lemon dressing",
          calories: 310,
          protein: 12
        },
        dinner: {
          name: "Baked Cod",
          description: "White fish with roasted vegetables",
          calories: 320,
          protein: 28
        }
      }
      // Add other days as needed...
    }
  };

  return basicPlan;
}