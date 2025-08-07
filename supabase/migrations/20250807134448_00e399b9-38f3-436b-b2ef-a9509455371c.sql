-- Fix the search_path issue for the handle_new_user function
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
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'user'::public.user_role)
  );
  
  -- Create default environment for new user
  INSERT INTO public.environments (user_id, name)
  VALUES (NEW.id, 'Meu Ambiente');
  
  RETURN NEW;
END;
$$;