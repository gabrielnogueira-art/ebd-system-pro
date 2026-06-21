
ALTER TABLE public.ministries
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS president_pastor text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS brand_primary_hsl text;

DROP POLICY IF EXISTS "ministries mae update" ON public.ministries;
CREATE POLICY "ministries mae update"
ON public.ministries
FOR UPDATE
TO authenticated
USING (
  public.is_master(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'igreja_mae'
      AND ur.ministry_id = ministries.id
  )
)
WITH CHECK (
  public.is_master(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'igreja_mae'
      AND ur.ministry_id = ministries.id
  )
);

DROP POLICY IF EXISTS "branding public read" ON storage.objects;
CREATE POLICY "branding public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "branding ministry write" ON storage.objects;
CREATE POLICY "branding ministry write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'igreja_mae'
        AND ur.ministry_id::text = (storage.foldername(name))[1]
    )
  )
);

DROP POLICY IF EXISTS "branding ministry update" ON storage.objects;
CREATE POLICY "branding ministry update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding'
  AND (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'igreja_mae'
        AND ur.ministry_id::text = (storage.foldername(name))[1]
    )
  )
);

DROP POLICY IF EXISTS "branding ministry delete" ON storage.objects;
CREATE POLICY "branding ministry delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding'
  AND (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'igreja_mae'
        AND ur.ministry_id::text = (storage.foldername(name))[1]
    )
  )
);
