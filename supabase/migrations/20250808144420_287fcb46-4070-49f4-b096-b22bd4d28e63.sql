-- 1) Add school_id to school_customizations and index
ALTER TABLE public.school_customizations
ADD COLUMN IF NOT EXISTS school_id uuid;

-- 2) Update RLS: drop existing gestor view policy and recreate with school filter
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE polname = 'Gestors can view their school customizations' 
      AND polrelid = 'public.school_customizations'::regclass
  ) THEN
    DROP POLICY "Gestors can view their school customizations" ON public.school_customizations;
  END IF;
END $$;

-- Recreate policy tying customization to the gestor's school via profiles.school_id
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

-- Keep admin manage-all policy as is; ensure RLS is enabled (safety)
ALTER TABLE public.school_customizations ENABLE ROW LEVEL SECURITY;

-- 3) Backfill: if school_id is null, and exactly one profile exists with role='gestor', optionally set based on created_by link
-- We avoid unsafe mass updates; leave nulls for admin to fix via UI.

-- 4) Optional helper index for filtering
CREATE INDEX IF NOT EXISTS idx_school_customizations_school_id ON public.school_customizations (school_id);
