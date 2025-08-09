-- Remove color customization columns from school_customizations table
ALTER TABLE public.school_customizations 
DROP COLUMN IF EXISTS primary_color,
DROP COLUMN IF EXISTS secondary_color;