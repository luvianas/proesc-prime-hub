-- Add zendesk_external_id field to school_customizations table
ALTER TABLE public.school_customizations 
ADD COLUMN zendesk_external_id text;