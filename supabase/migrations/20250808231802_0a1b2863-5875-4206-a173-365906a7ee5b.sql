-- Unify 'user' into 'gestor'
-- 1) Make 'gestor' the default role
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'gestor'::public.user_role;

-- 2) Update existing users with role 'user' to 'gestor'
UPDATE public.profiles
SET role = 'gestor'::public.user_role
WHERE role = 'user'::public.user_role;

-- 3) Update handle_new_user to default to 'gestor' instead of 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'gestor'::public.user_role)
  );
  
  -- Create default environment for new user
  INSERT INTO public.environments (user_id, name)
  VALUES (NEW.id, 'Meu Ambiente');
  
  RETURN NEW;
END;
$$;