-- Create usage_events table for tracking app usage
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_role public.user_role NOT NULL,
  school_id uuid,
  session_id text,
  event_type text NOT NULL,
  event_name text NOT NULL,
  event_properties jsonb,
  page text,
  referrer text,
  device text,
  browser text,
  os text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON public.usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON public.usage_events (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_school_id ON public.usage_events (school_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_event_type ON public.usage_events (event_type);

-- Enable RLS
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can insert their own events" ON public.usage_events;
CREATE POLICY "Users can insert their own events"
ON public.usage_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all usage events" ON public.usage_events;
CREATE POLICY "Admins can view all usage events"
ON public.usage_events
FOR SELECT
TO authenticated
USING (public.is_admin());
