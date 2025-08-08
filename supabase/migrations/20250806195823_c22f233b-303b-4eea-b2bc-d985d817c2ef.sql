-- Create admin user 1: lucasviana@proesc.com
-- Note: In production, you would use Supabase auth API to create these users
-- For now, we'll create the profile records directly

-- Insert profile for admin user 1
INSERT INTO public.profiles (user_id, email, name, role, is_active) 
VALUES (
  gen_random_uuid(),
  'lucasviana@proesc.com',
  'Lucas Viana',
  'admin',
  true
);

-- Insert profile for admin user 2  
INSERT INTO public.profiles (user_id, email, name, role, is_active)
VALUES (
  gen_random_uuid(), 
  'marcos.souza@proesc.com',
  'Marcos Souza',
  'admin',
  true
);

-- Insert profile for end user
INSERT INTO public.profiles (user_id, email, name, role, is_active)
VALUES (
  gen_random_uuid(),
  'escola.usuario@proesc.com', 
  'Usuário da Escola',
  'user',
  true
);

-- Create environments for each user
-- Environment for Lucas Viana
INSERT INTO public.environments (user_id, name, theme_color, settings)
SELECT 
  user_id,
  'Ambiente Admin - Lucas',
  '#1f2937',
  '{"dashboard_links": {"metabase": ""}, "consultant_data": {}, "customizations": {}}'::jsonb
FROM public.profiles 
WHERE email = 'lucasviana@proesc.com';

-- Environment for Marcos Souza  
INSERT INTO public.environments (user_id, name, theme_color, settings)
SELECT 
  user_id,
  'Ambiente Admin - Marcos', 
  '#059669',
  '{"dashboard_links": {"metabase": ""}, "consultant_data": {}, "customizations": {}}'::jsonb
FROM public.profiles
WHERE email = 'marcos.souza@proesc.com';

-- Environment for end user
INSERT INTO public.environments (user_id, name, theme_color, settings)
SELECT 
  user_id,
  'Escola ProEsc',
  '#3b82f6', 
  '{"dashboard_links": {"metabase": ""}, "consultant_data": {"name": "", "phone": "", "email": ""}, "school_info": {}}'::jsonb
FROM public.profiles
WHERE email = 'escola.usuario@proesc.com';