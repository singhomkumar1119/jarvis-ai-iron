DROP POLICY IF EXISTS "Admins can read visitor events" ON public.visitor_events;
CREATE POLICY "Admins can read visitor events"
ON public.visitor_events
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read uploaded files" ON storage.objects;
CREATE POLICY "Admins can read uploaded files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'uploads' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));