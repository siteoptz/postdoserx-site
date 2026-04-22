import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for admin operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database schema setup SQL
export const DATABASE_SCHEMA = `
-- Enable Row Level Security
ALTER DATABASE postgres SET "app.settings.jwt_secret" TO '${process.env.JWT_SECRET}';

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  tier VARCHAR(50) NOT NULL DEFAULT 'trial',
  subscription_status VARCHAR(50) DEFAULT NULL,
  stripe_customer_id VARCHAR(255),
  ghl_contact_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  medication VARCHAR(100),
  dose VARCHAR(50),
  injection_day INTEGER, -- 0-6 (Sunday-Saturday)
  start_weight DECIMAL(5,2),
  goal_weight DECIMAL(5,2),
  goals TEXT[],
  dietary_preferences TEXT[],
  allergies TEXT[],
  notification_preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create symptom_logs table
CREATE TABLE IF NOT EXISTS symptom_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  symptoms JSONB NOT NULL DEFAULT '{}',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- Create meal_ratings table
CREATE TABLE IF NOT EXISTS meal_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  ratings JSONB NOT NULL DEFAULT '{}',
  feedback JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  plan_data JSONB NOT NULL DEFAULT '{}',
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Create grocery_lists table
CREATE TABLE IF NOT EXISTS grocery_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  list_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Create progress_logs table
CREATE TABLE IF NOT EXISTS progress_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  weight DECIMAL(5,2),
  measurements JSONB DEFAULT '{}',
  notes TEXT,
  photos TEXT[], -- URLs to photos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_user_date ON symptom_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_meal_ratings_user_date ON meal_ratings(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_week ON meal_plans(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_week ON grocery_lists(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_progress_logs_user_date ON progress_logs(user_id, log_date);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own user_profiles" ON user_profiles FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view own symptom_logs" ON symptom_logs FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view own meal_ratings" ON meal_ratings FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view own meal_plans" ON meal_plans FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view own grocery_lists" ON grocery_lists FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can view own progress_logs" ON progress_logs FOR ALL USING (auth.uid()::text = user_id::text);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_symptom_logs_updated_at BEFORE UPDATE ON symptom_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_ratings_updated_at BEFORE UPDATE ON meal_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grocery_lists_updated_at BEFORE UPDATE ON grocery_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progress_logs_updated_at BEFORE UPDATE ON progress_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// Helper functions for database operations
export async function createUser({ email, googleId, name, tier = 'trial', ghlContactId = null, stripeCustomerId = null }) {
  // SAFETY: Ensure all new users are provisioned to avoid authentication issues
  // If no ghl_contact_id is provided, generate a fallback to mark user as provisioned
  const safeGhlContactId = ghlContactId || `auto_provisioned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Prepare user data - only include fields that exist in the actual schema
  const userData = {
    email,
    tier,
    ghl_contact_id: safeGhlContactId,
    stripe_customer_id: stripeCustomerId
  };
  
  // Add name if provided (maps to actual 'name' column, not 'google_id')
  if (name || googleId) {
    userData.name = name || googleId; // Use name if available, fallback to googleId
  }
  
  const { data, error } = await supabase
    .from('users')
    .upsert(userData, {
      onConflict: 'email'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  // Log when we auto-provision a user for monitoring
  if (!ghlContactId) {
    console.log(`🔧 Auto-provisioned user ${email} with fallback ghl_contact_id: ${safeGhlContactId}`);
  }

  return data;
}

// Ensure a user is provisioned (has ghl_contact_id) for reliable authentication
export async function ensureUserProvisioned(userId) {
  const { isProvisionedUser } = await import('./auth-entitlement.js');
  
  const user = await getUserById(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  
  const provisioned = isProvisionedUser(user);
  if (provisioned) {
    return user; // Already provisioned
  }
  
  // Auto-provision the user
  const safeGhlContactId = `auto_provisioned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const updated = await updateUser(userId, {
    ghl_contact_id: safeGhlContactId
  });
  
  console.log(`🔧 Auto-provisioned existing user ${user.email} with ghl_contact_id: ${safeGhlContactId}`);
  return updated;
}

const USER_SELECT = `
  *,
  user_profiles (*)
`;

export async function getUserByEmail(email) {
  const raw = String(email || '').trim();
  if (!raw) {
    return null;
  }

  // 1) Exact match (index-friendly)
  let { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .eq('email', raw)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user: ${error.message}`);
  }
  if (data) {
    return data;
  }

  // 2) Lowercase match (common storage pattern)
  const lower = raw.toLowerCase();
  if (lower !== raw) {
    ({ data, error } = await supabase
      .from('users')
      .select(USER_SELECT)
      .eq('email', lower)
      .maybeSingle());
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user: ${error.message}`);
    }
    if (data) {
      return data;
    }
  }

  // 3) Case-insensitive (legacy rows with different casing in local-part/domain)
  const { data: rows, error: ilikeError } = await supabase
    .from('users')
    .select(USER_SELECT)
    .ilike('email', raw)
    .limit(2);

  if (ilikeError) {
    throw new Error(`Failed to get user: ${ilikeError.message}`);
  }
  if (rows && rows.length === 1) {
    return rows[0];
  }

  return null;
}

export async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      user_profiles (*)
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
}

export async function updateUser(id, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return data;
}

export async function createOrUpdateUserProfile(userId, profileData) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      ...profileData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create/update profile: ${error.message}`);
  }

  return data;
}