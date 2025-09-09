-- Renomear campo zendesk_external_id para proesc_id na tabela school_customizations
ALTER TABLE public.school_customizations 
RENAME COLUMN zendesk_external_id TO proesc_id;