
-- 1) Remove permissive ALL true/true policies on hierarchy tables
DROP POLICY IF EXISTS "auth manage ministries" ON public.ministries;
DROP POLICY IF EXISTS "auth manage headquarters" ON public.headquarters;
DROP POLICY IF EXISTS "auth manage regionals" ON public.regionals;
DROP POLICY IF EXISTS "auth manage congregations" ON public.congregations;

-- 2) Remove anon SELECT policies on sensitive tables
DROP POLICY IF EXISTS "classes anon read" ON public.classes;
DROP POLICY IF EXISTS "students anon read" ON public.students;
DROP POLICY IF EXISTS "registrations anon read" ON public.registrations;

-- 3) Storage: tighten pix-receipts to authenticated only
DROP POLICY IF EXISTS "Anyone can view PIX receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload PIX receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete PIX receipts" ON storage.objects;

CREATE POLICY "Authenticated can view PIX receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pix-receipts');

CREATE POLICY "Authenticated can upload PIX receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pix-receipts');

CREATE POLICY "Authenticated can delete PIX receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pix-receipts');

-- 4) Revoke EXECUTE on SECURITY DEFINER helper from anon/public
REVOKE EXECUTE ON FUNCTION public.user_can_see_congregation(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_see_congregation(uuid, uuid) TO authenticated, service_role;

-- 5) Leftover empty "public.ministries" table has RLS but no policy → add deny-all
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'public.ministries'
  ) THEN
    EXECUTE 'CREATE POLICY "deny all" ON public."public.ministries" FOR ALL TO PUBLIC USING (false) WITH CHECK (false)';
  END IF;
END $$;
