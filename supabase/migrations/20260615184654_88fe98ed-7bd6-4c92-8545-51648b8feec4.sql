
-- 1) Enable RLS on the leftover weirdly-named table (no policies = no access through API)
ALTER TABLE IF EXISTS public."public.ministries" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."public.ministries" FROM anon, authenticated;

-- 2) Replace overly permissive "ALL USING(true)" policies with master-only write + public read
-- ministries
DROP POLICY IF EXISTS "allow_all_ministries" ON public.ministries;
DROP POLICY IF EXISTS "auth manage ministries" ON public.ministries;
DROP POLICY IF EXISTS "read ministries" ON public.ministries;
CREATE POLICY "ministries public read" ON public.ministries
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ministries master write" ON public.ministries
  FOR INSERT TO authenticated WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "ministries master update" ON public.ministries
  FOR UPDATE TO authenticated USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "ministries master delete" ON public.ministries
  FOR DELETE TO authenticated USING (public.is_master(auth.uid()));

-- headquarters
DROP POLICY IF EXISTS "allow_all_headquarters" ON public.headquarters;
DROP POLICY IF EXISTS "auth manage headquarters" ON public.headquarters;
DROP POLICY IF EXISTS "read headquarters" ON public.headquarters;
CREATE POLICY "headquarters public read" ON public.headquarters
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "headquarters master write" ON public.headquarters
  FOR INSERT TO authenticated WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "headquarters master update" ON public.headquarters
  FOR UPDATE TO authenticated USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "headquarters master delete" ON public.headquarters
  FOR DELETE TO authenticated USING (public.is_master(auth.uid()));

-- regionals
DROP POLICY IF EXISTS "allow_all_regionals" ON public.regionals;
DROP POLICY IF EXISTS "auth manage regionals" ON public.regionals;
DROP POLICY IF EXISTS "read regionals" ON public.regionals;
CREATE POLICY "regionals public read" ON public.regionals
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "regionals master write" ON public.regionals
  FOR INSERT TO authenticated WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "regionals master update" ON public.regionals
  FOR UPDATE TO authenticated USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "regionals master delete" ON public.regionals
  FOR DELETE TO authenticated USING (public.is_master(auth.uid()));

-- congregations
DROP POLICY IF EXISTS "allow_all_congregations" ON public.congregations;
DROP POLICY IF EXISTS "auth manage congregations" ON public.congregations;
DROP POLICY IF EXISTS "read congregations" ON public.congregations;
CREATE POLICY "congregations public read" ON public.congregations
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "congregations master write" ON public.congregations
  FOR INSERT TO authenticated WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "congregations master update" ON public.congregations
  FOR UPDATE TO authenticated USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "congregations master delete" ON public.congregations
  FOR DELETE TO authenticated USING (public.is_master(auth.uid()));

-- 3) Revoke EXECUTE on SECURITY DEFINER helpers from anon/authenticated.
-- They are still callable from RLS policy expressions because policies run as the
-- function owner, not the caller. This closes direct RPC invocation.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_master(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_congregation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_ministry(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_headquarters(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_regional(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_can_see_congregation(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.teacher_has_class(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_pending() FROM PUBLIC, anon, authenticated;

-- approve_user / reject_user are master-only RPCs intentionally callable by signed-in users
-- (they self-check via is_master), keep EXECUTE for authenticated only.
REVOKE EXECUTE ON FUNCTION public.approve_user(uuid, text, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_user(uuid, text, uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user(uuid) TO authenticated;
