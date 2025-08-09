-- Add new columns to school_customizations for improved color system
ALTER TABLE public.school_customizations 
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#64748b',
ADD COLUMN IF NOT EXISTS consultant_whatsapp text;

-- Migrate existing theme_color to primary_color if exists
UPDATE public.school_customizations 
SET primary_color = theme_color 
WHERE theme_color IS NOT NULL AND primary_color = '#3b82f6';

-- Add new columns to profiles for admin profile customization
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS consultant_calendar_url text,
ADD COLUMN IF NOT EXISTS consultant_whatsapp text;