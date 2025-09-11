-- Add address and geolocation fields to school_customizations table
ALTER TABLE public.school_customizations 
ADD COLUMN address TEXT,
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN market_analysis JSONB DEFAULT '{}'::jsonb;