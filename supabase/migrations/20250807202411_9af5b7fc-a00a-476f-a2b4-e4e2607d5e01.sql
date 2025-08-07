-- Add 'gestor' role to the user_role enum
ALTER TYPE public.user_role ADD VALUE 'gestor';

-- Update RLS policies to allow admins to create users
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
CREATE POLICY "Admins can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (is_admin());

-- Allow admins to update user roles
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (is_admin());

-- Create a table for school customizations
CREATE TABLE public.school_customizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  theme_color TEXT DEFAULT '#3b82f6',
  logo_url TEXT,
  consultant_name TEXT,
  consultant_photo_url TEXT,
  zendesk_integration_url TEXT,
  metabase_integration_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

-- Enable RLS on school_customizations
ALTER TABLE public.school_customizations ENABLE ROW LEVEL SECURITY;

-- RLS policies for school_customizations
CREATE POLICY "Admins can manage school customizations" 
ON public.school_customizations 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Gestors can view their school customizations" 
ON public.school_customizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'gestor'
  )
);

-- Add school_id to profiles to link gestors to schools
ALTER TABLE public.profiles ADD COLUMN school_id UUID REFERENCES public.school_customizations(id);

-- Create trigger for school_customizations updated_at
CREATE TRIGGER update_school_customizations_updated_at
BEFORE UPDATE ON public.school_customizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update get_current_user_role function to handle the new gestor role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;