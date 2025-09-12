-- Add market_analysis_enabled column to school_customizations table
ALTER TABLE public.school_customizations 
ADD COLUMN market_analysis_enabled boolean NOT NULL DEFAULT false;

-- Add comment to document the purpose
COMMENT ON COLUMN public.school_customizations.market_analysis_enabled IS 'Controls whether the Market Analysis feature is enabled for this school to manage Google Maps API usage';