-- Create prime_leads table for lead capture
CREATE TABLE public.prime_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.prime_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead (public form)
CREATE POLICY "Anyone can submit a lead"
ON public.prime_leads FOR INSERT
WITH CHECK (true);

-- Only admins can view leads
CREATE POLICY "Only admins can view leads"
ON public.prime_leads FOR SELECT
USING (is_admin());

-- Only admins can update leads
CREATE POLICY "Only admins can update leads"
ON public.prime_leads FOR UPDATE
USING (is_admin());

-- Only admins can delete leads
CREATE POLICY "Only admins can delete leads"
ON public.prime_leads FOR DELETE
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_prime_leads_updated_at
BEFORE UPDATE ON public.prime_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();