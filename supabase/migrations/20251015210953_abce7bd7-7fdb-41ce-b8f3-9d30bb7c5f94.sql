-- Create table for user-reported school prices
CREATE TABLE IF NOT EXISTS public.user_reported_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_place_id TEXT NOT NULL,
  school_name TEXT NOT NULL,
  monthly_fee INTEGER NOT NULL,
  enrollment_fee INTEGER,
  annual_fee INTEGER,
  reported_by UUID REFERENCES auth.users(id),
  verified BOOLEAN DEFAULT false,
  confidence_votes INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_reported_prices ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read verified prices
CREATE POLICY "Anyone can read verified prices"
ON public.user_reported_prices
FOR SELECT
USING (verified = true OR auth.uid() = reported_by);

-- Policy: Authenticated users can insert prices
CREATE POLICY "Authenticated users can report prices"
ON public.user_reported_prices
FOR INSERT
WITH CHECK (auth.uid() = reported_by);

-- Policy: Users can update their own reports
CREATE POLICY "Users can update their own reports"
ON public.user_reported_prices
FOR UPDATE
USING (auth.uid() = reported_by)
WITH CHECK (auth.uid() = reported_by);

-- Policy: Admins can verify and manage all prices
CREATE POLICY "Admins can manage all prices"
ON public.user_reported_prices
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_reported_prices_place_id 
ON public.user_reported_prices(school_place_id);

CREATE INDEX IF NOT EXISTS idx_user_reported_prices_verified 
ON public.user_reported_prices(verified) 
WHERE verified = true;

-- Trigger for updated_at
CREATE TRIGGER update_user_reported_prices_updated_at
BEFORE UPDATE ON public.user_reported_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();