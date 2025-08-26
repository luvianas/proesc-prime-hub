-- Create function to sync consultant data from profiles to school_customizations
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync consultant data when consultant_id changes
CREATE OR REPLACE TRIGGER trigger_sync_consultant_data
  AFTER UPDATE OF consultant_id ON school_customizations
  FOR EACH ROW
  EXECUTE FUNCTION sync_consultant_data_to_school();

-- Create trigger to sync consultant data when consultant profile is updated  
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
$$ LANGUAGE plpgsql;

-- Create trigger on profiles table to sync changes back to school_customizations
CREATE OR REPLACE TRIGGER trigger_sync_profile_to_schools
  AFTER UPDATE OF name, avatar_url, consultant_whatsapp, consultant_calendar_url ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_consultant_profile_changes();

-- Initial sync for existing data
UPDATE school_customizations 
SET 
  consultant_whatsapp = profiles.consultant_whatsapp,
  consultant_calendar_url = profiles.consultant_calendar_url,
  consultant_name = profiles.name,
  consultant_photo_url = profiles.avatar_url,
  updated_at = now()
FROM profiles 
WHERE profiles.user_id = school_customizations.consultant_id 
AND school_customizations.consultant_id IS NOT NULL;