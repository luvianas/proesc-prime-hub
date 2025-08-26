-- Fix security issues by setting search_path for the functions
CREATE OR REPLACE FUNCTION sync_consultant_data_to_school()
RETURNS TRIGGER AS $$
BEGIN
  -- Update school_customizations with consultant data when consultant_id is set
  IF NEW.consultant_id IS NOT NULL THEN
    UPDATE school_customizations 
    SET 
      consultant_whatsapp = profiles.consultant_whatsapp,
      consultant_calendar_url = profiles.consultant_calendar_url,
      consultant_name = profiles.name,
      consultant_photo_url = profiles.avatar_url,
      updated_at = now()
    FROM profiles 
    WHERE profiles.user_id = NEW.consultant_id 
    AND school_customizations.id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Fix security for the consultant profile sync function
CREATE OR REPLACE FUNCTION sync_consultant_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all school_customizations that reference this consultant
  UPDATE school_customizations 
  SET 
    consultant_whatsapp = NEW.consultant_whatsapp,
    consultant_calendar_url = NEW.consultant_calendar_url,
    consultant_name = NEW.name,
    consultant_photo_url = NEW.avatar_url,
    updated_at = now()
  WHERE consultant_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';