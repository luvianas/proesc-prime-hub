-- Create users using Supabase Auth Admin API
-- Note: These are test user creation commands

-- For production use, you would need to use the auth.admin functions
-- But since we can't create auth users directly in SQL, let's prepare the system

-- First, let's check if there are any existing users in profiles
SELECT email, name, role FROM public.profiles;