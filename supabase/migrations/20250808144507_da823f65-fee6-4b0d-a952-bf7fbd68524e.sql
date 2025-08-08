-- Fix migration: use DROP POLICY IF EXISTS and recreate RLS

-- 1) Add school_id to school_customizations
ALTER TABLE public.school_customizations
ADD COLUMN IF NOT EXISTS school_id uuid;

-- 2) Replace gestor SELECT policy with school-bound filtering
DROP POLICY IF EXISTS "Gestors can view their school customizations" ON public.school_customizations;

CREATE POLICY "Gestors can view their school customizations"
ON public.school_customizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'gestor'::public.user_role
      AND p.school_id IS NOT NULL
      AND p.school_id = public.school_customizations.school_id
  )
);

-- 3) Safety: ensure RLS is enabled and keep admin manage-all active (already exists)
ALTER TABLE public.school_customizations ENABLE ROW LEVEL SECURITY;

-- 4) Index for performance
CREATE INDEX IF NOT EXISTS idx_school_customizations_school_id ON public.school_customizations (school_id);
