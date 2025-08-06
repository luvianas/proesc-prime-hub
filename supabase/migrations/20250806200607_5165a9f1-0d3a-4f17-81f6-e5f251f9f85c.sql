-- Create the first admin user directly in auth.users table
-- This is needed for bootstrapping the admin system

-- First, let's create a function to create the initial admin
CREATE OR REPLACE FUNCTION create_initial_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Generate a UUID for the admin user
  admin_user_id := gen_random_uuid();
  
  -- Insert into auth.users (simulating what Supabase auth would do)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
  ) VALUES (
    admin_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'lucasviana@proesc.com',
    crypt('proesc123', gen_salt('bf')), -- Hash the password
    now(),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Lucas Viana", "role": "admin"}',
    false,
    now()
  );
  
  -- The trigger will automatically create the profile and environment
  
END;
$$;

-- Execute the function to create the admin
SELECT create_initial_admin();

-- Drop the function as it's no longer needed
DROP FUNCTION create_initial_admin();