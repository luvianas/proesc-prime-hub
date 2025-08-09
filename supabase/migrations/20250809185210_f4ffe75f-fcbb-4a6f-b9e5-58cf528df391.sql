-- Add consultant_id column to school_customizations table
ALTER TABLE public.school_customizations 
ADD COLUMN IF NOT EXISTS consultant_id uuid REFERENCES public.profiles(user_id);

-- Update existing records to set consultant_id based on consultant_name (admin users)
-- This assumes consultant_name matches the name in profiles table for admin users
UPDATE public.school_customizations 
SET consultant_id = (
  SELECT user_id 
  FROM public.profiles 
  WHERE role = 'admin' AND name = school_customizations.consultant_name 
  LIMIT 1
)
WHERE consultant_name IS NOT NULL AND consultant_id IS NULL;