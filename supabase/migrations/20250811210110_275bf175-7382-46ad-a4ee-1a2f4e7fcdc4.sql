-- Add per-banner duration in seconds (nullable: uses default when null)
ALTER TABLE public.school_banners
ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- Optional: clamp to reasonable range with a simple CHECK (immutable)
ALTER TABLE public.school_banners
ADD CONSTRAINT school_banners_duration_seconds_range
CHECK (duration_seconds IS NULL OR (duration_seconds >= 1 AND duration_seconds <= 120));