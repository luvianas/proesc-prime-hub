-- Create table for school pricing data
CREATE TABLE public.school_pricing_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  monthly_fee DECIMAL(10,2),
  annual_fee DECIMAL(10,2),
  enrollment_fee DECIMAL(10,2),
  price_range TEXT, -- 'budget', 'moderate', 'expensive', 'luxury'
  data_source TEXT NOT NULL, -- 'melhorescola', 'google_places', 'manual', 'estimated'
  confidence_score INTEGER DEFAULT 50, -- 0-100
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  place_id TEXT, -- Google Places ID for linking
  website_url TEXT,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_pricing_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read pricing data" 
ON public.school_pricing_data 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage pricing data" 
ON public.school_pricing_data 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Create indexes for better performance
CREATE INDEX idx_school_pricing_name_city ON public.school_pricing_data (school_name, city);
CREATE INDEX idx_school_pricing_place_id ON public.school_pricing_data (place_id);
CREATE INDEX idx_school_pricing_updated ON public.school_pricing_data (last_updated);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_school_pricing_data_updated_at
BEFORE UPDATE ON public.school_pricing_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();