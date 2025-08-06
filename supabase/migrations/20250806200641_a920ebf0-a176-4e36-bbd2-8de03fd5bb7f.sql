-- Create the user_role enum if it doesn't exist
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Now create a simpler approach - just insert the profile directly
-- Since we can't easily create auth users manually, let's create a way to promote an existing user to admin

-- Insert the initial admin profile (this will be used when the user signs up)
INSERT INTO public.profiles (user_id, email, name, role, is_active) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'lucasviana@proesc.com',
  'Lucas Viana',
  'admin'::user_role,
  true
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin'::user_role,
  name = 'Lucas Viana';

-- Create environment for the admin
INSERT INTO public.environments (user_id, name, theme_color, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Ambiente Admin - Lucas',
  '#1f2937',
  '{"dashboard_links": {"metabase": ""}, "consultant_data": {}, "customizations": {}}'::jsonb
) ON CONFLICT (user_id) DO UPDATE SET
  name = 'Ambiente Admin - Lucas',
  theme_color = '#1f2937';