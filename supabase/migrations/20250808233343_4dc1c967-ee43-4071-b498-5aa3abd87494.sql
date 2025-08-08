-- Storage policies for school-assets bucket
-- Ensure public read and admin-only writes
DROP POLICY IF EXISTS "Public read school assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload school assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update school assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete school assets" ON storage.objects;

CREATE POLICY "Public read school assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-assets');

CREATE POLICY "Admins can upload school assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'school-assets' AND is_admin());

CREATE POLICY "Admins can update school assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'school-assets' AND is_admin());

CREATE POLICY "Admins can delete school assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'school-assets' AND is_admin());