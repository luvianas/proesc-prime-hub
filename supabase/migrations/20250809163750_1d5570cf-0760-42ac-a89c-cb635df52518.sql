-- Update and delete policies for school_banners to support management

-- Allow UPDATE for global banners by admins
CREATE POLICY "Update global banners by admins"
ON public.school_banners
FOR UPDATE
USING (is_global = true AND public.get_current_user_role() = 'admin')
WITH CHECK (is_global = true AND public.get_current_user_role() = 'admin');

-- Allow UPDATE for school banners by gestores/admins of same school
CREATE POLICY "Update school banners by same school gestores/admins"
ON public.school_banners
FOR UPDATE
USING (
  COALESCE(is_global, false) = false
  AND school_id = public.get_current_user_school_id()
  AND public.get_current_user_role() IN ('admin','gestor')
)
WITH CHECK (
  COALESCE(is_global, false) = false
  AND school_id = public.get_current_user_school_id()
  AND public.get_current_user_role() IN ('admin','gestor')
);

-- Allow DELETE for global banners by admins
CREATE POLICY "Delete global banners by admins"
ON public.school_banners
FOR DELETE
USING (is_global = true AND public.get_current_user_role() = 'admin');

-- Allow DELETE for school banners by gestores/admins of same school
CREATE POLICY "Delete school banners by same school gestores/admins"
ON public.school_banners
FOR DELETE
USING (
  COALESCE(is_global, false) = false
  AND school_id = public.get_current_user_school_id()
  AND public.get_current_user_role() IN ('admin','gestor')
);
