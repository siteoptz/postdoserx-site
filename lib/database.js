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
  subscription_status VARCHAR(50) DEFAULT 'active',
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
export async function createUser({ email, googleId, tier = 'trial', ghlContactId = null, stripeCustomerId = null }) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      email,
      google_id: googleId,
      tier,
      ghl_contact_id: ghlContactId,
      stripe_customer_id: stripeCustomerId
    }, {
      onConflict: 'email'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data;
}

export async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      user_profiles (*)
    `)
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
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