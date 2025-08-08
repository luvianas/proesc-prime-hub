-- Create a function to promote a user to admin by email
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user's role to admin
  UPDATE public.profiles 
  SET role = 'admin'
  WHERE email = user_email;
  
  -- If no user found, this will be handled by the application
  IF NOT FOUND THEN
    RAISE NOTICE 'User with email % not found', user_email;
  END IF;
END;
$$;

-- Promote the lucas user to admin if they exist
SELECT promote_user_to_admin('lucasviana@proesc.com');