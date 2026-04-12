import { supabase } from '../../lib/database.js';
import { verifyJWT } from '../../lib/jwt.js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
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

    // Fetch user's complete dashboard data
    const [
      userProfile,
      recentSymptoms,
      currentMealPlan,
      recentProgress,
      upcomingMeals
    ] = await Promise.all([
      getUserProfile(userId),
      getRecentSymptoms(userId),
      getCurrentMealPlan(userId),
      getRecentProgress(userId),
      getUpcomingMeals(userId)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        profile: userProfile,
        symptoms: recentSymptoms,
        mealPlan: currentMealPlan,
        progress: recentProgress,
        upcomingMeals: upcomingMeals,
        dashboardStats: {
          totalSymptomLogs: recentSymptoms.length,
          currentStreak: calculateStreak(recentSymptoms),
          weekProgress: calculateWeekProgress(recentProgress)
        }
      }
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Helper functions to fetch specific dashboard data

async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch user profile:', error);
    return null;
  }

  return data;
}

async function getRecentSymptoms(userId) {
  const { data, error } = await supabase
    .from('symptom_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(7);

  if (error) {
    console.error('Failed to fetch symptoms:', error);
    return [];
  }

  return data || [];
}

async function getCurrentMealPlan(userId) {
  // Get current week's meal plan
  const startOfWeek = getStartOfWeek(new Date());
  
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', startOfWeek.toISOString().split('T')[0])
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch meal plan:', error);
    return null;
  }

  return data;
}

async function getRecentProgress(userId) {
  const { data, error } = await supabase
    .from('progress_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(30); // Last 30 days

  if (error) {
    console.error('Failed to fetch progress:', error);
    return [];
  }

  return data || [];
}

async function getUpcomingMeals(userId) {
  const profile = await getUserProfile(userId);
  if (!profile || !profile.injection_day) {
    return [];
  }

  // Calculate next few meals based on injection schedule
  const today = new Date();
  const nextInjection = getNextInjectionDate(today, profile.injection_day);
  
  // Get meal plan for the week containing next injection
  const weekStart = getStartOfWeek(nextInjection);
  const { data: mealPlan } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStart.toISOString().split('T')[0])
    .single();

  if (!mealPlan || !mealPlan.plan_data) {
    return [];
  }

  // Extract next 3 meals from plan
  return extractUpcomingMeals(mealPlan.plan_data, nextInjection);
}

// Utility functions

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function getNextInjectionDate(fromDate, injectionDay) {
  const today = new Date(fromDate);
  const currentDay = today.getDay();
  const daysUntilInjection = (injectionDay - currentDay + 7) % 7;
  
  const nextInjection = new Date(today);
  nextInjection.setDate(today.getDate() + (daysUntilInjection || 7));
  
  return nextInjection;
}

function calculateStreak(symptoms) {
  if (!symptoms || symptoms.length === 0) return 0;
  
  // Calculate consecutive days with symptom logs
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < symptoms.length; i++) {
    const logDate = new Date(symptoms[i].log_date);
    const daysDiff = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === i) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function calculateWeekProgress(progressLogs) {
  if (!progressLogs || progressLogs.length === 0) return 0;
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const thisWeekLogs = progressLogs.filter(log => 
    new Date(log.log_date) >= oneWeekAgo
  );
  
  return thisWeekLogs.length;
}

function extractUpcomingMeals(planData, fromDate) {
  // This would extract the next few meals from the meal plan structure
  // For now, return sample data structure
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  
  const upcoming = [];
  const startDate = new Date(fromDate);
  
  for (let day = 0; day < 3; day++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + day);
    
    const dayName = dayNames[date.getDay()];
    const dayPlan = planData[dayName.toLowerCase()];
    
    if (dayPlan) {
      mealTypes.forEach(mealType => {
        if (dayPlan[mealType]) {
          upcoming.push({
            date: date.toISOString().split('T')[0],
            day: dayName,
            type: mealType,
            meal: dayPlan[mealType]
          });
        }
      });
    }
  }
  
  return upcoming.slice(0, 6); // Return next 6 meals
}