-- Add customization fields to school_customizations
ALTER TABLE public.school_customizations
ADD COLUMN IF NOT EXISTS consultant_calendar_url text,
ADD COLUMN IF NOT EXISTS consultant_whatsapp text,
ADD COLUMN IF NOT EXISTS dashboard_links jsonb DEFAULT '{}'::jsonb;

-- Create banners table for schools
CREATE TABLE IF NOT EXISTS public.school_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid,
  image_url text NOT NULL,
  title text,
  link_url text,
  order_index int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.school_banners ENABLE ROW LEVEL SECURITY;

-- Admins full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_banners' AND policyname = 'Admins can manage school banners'
  ) THEN
    CREATE POLICY "Admins can manage school banners"
    ON public.school_banners
    AS RESTRICTIVE
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());
  END IF;
END $$;

-- Gestors can view their school's banners
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_banners' AND policyname = 'Gestors can view their school banners'
  ) THEN
    CREATE POLICY "Gestors can view their school banners"
    ON public.school_banners
    AS RESTRICTIVE
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.role = 'gestor'::public.user_role
          AND p.school_id IS NOT NULL
          AND p.school_id = school_banners.school_id
      )
    );
  END IF;
END $$;

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS update_school_banners_updated_at ON public.school_banners;
CREATE TRIGGER update_school_banners_updated_at
BEFORE UPDATE ON public.school_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_school_banners_school_id ON public.school_banners (school_id);
CREATE INDEX IF NOT EXISTS idx_school_banners_order ON public.school_banners (school_id, order_index);
