-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create environments table
CREATE TABLE public.environments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  theme_color TEXT DEFAULT '#3b82f6',
  background_image TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_current_user_role() = 'admin';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (is_admin());

-- RLS Policies for environments table
CREATE POLICY "Users can view their own environment" 
ON public.environments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all environments" 
ON public.environments 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can create environments" 
ON public.environments 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update environments" 
ON public.environments 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Admins can delete environments" 
ON public.environments 
FOR DELETE 
USING (is_admin());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_environments_updated_at
BEFORE UPDATE ON public.environments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile and environment when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'user')
  );
  
  -- Create default environment for new user
  INSERT INTO public.environments (user_id, name)
  VALUES (NEW.id, 'Meu Ambiente');
  
  RETURN NEW;
END;
$$;

-- Create trigger to handle new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();