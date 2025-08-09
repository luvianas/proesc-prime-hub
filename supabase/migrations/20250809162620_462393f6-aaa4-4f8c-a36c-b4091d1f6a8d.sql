-- Helper: current user's school_id
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT school_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.school_banners ENABLE ROW LEVEL SECURITY;

-- Allow selecting global banners or those from the user's school (admins see all)
CREATE POLICY "Select global or user's school banners"
ON public.school_banners
FOR SELECT
USING (
  is_global = true
  OR school_id = public.get_current_user_school_id()
  OR public.get_current_user_role() = 'admin'
);

-- Allow inserting GLOBAL banners (school_id must be NULL) by admins/gestores
CREATE POLICY "Insert global banners by admins or gestores"
ON public.school_banners
FOR INSERT
WITH CHECK (
  is_global = true
  AND school_id IS NULL
  AND public.get_current_user_role() IN ('admin','gestor')
);

-- Allow inserting SCHOOL banners by users from the same school who are admins/gestores
CREATE POLICY "Insert school banners by same school gestores/admins"
ON public.school_banners
FOR INSERT
WITH CHECK (
  COALESCE(is_global, false) = false
  AND school_id = public.get_current_user_school_id()
  AND public.get_current_user_role() IN ('admin','gestor')
);
