-- Drop existing insert policies to recreate them
DROP POLICY IF EXISTS "Insert global banners by admins or gestores" ON public.school_banners;
DROP POLICY IF EXISTS "Insert school banners by same school gestores/admins" ON public.school_banners;

-- Create a simpler, more permissive policy for inserting banners
-- Allow gestores and admins to insert any banner
CREATE POLICY "Allow banner insert for gestores and admins"
ON public.school_banners
FOR INSERT
WITH CHECK (
  public.get_current_user_role() IN ('admin', 'gestor')
);