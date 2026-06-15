
-- Add missing Data API grants (no grants existed -> PostgREST returned empty)
GRANT SELECT ON public.ministries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ministries TO authenticated;
GRANT ALL ON public.ministries TO service_role;

GRANT SELECT ON public.headquarters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.headquarters TO authenticated;
GRANT ALL ON public.headquarters TO service_role;

GRANT SELECT ON public.regionals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regionals TO authenticated;
GRANT ALL ON public.regionals TO service_role;

GRANT SELECT ON public.congregations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.congregations TO authenticated;
GRANT ALL ON public.congregations TO service_role;

GRANT SELECT ON public.classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_classes TO authenticated;
GRANT ALL ON public.teacher_classes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_users TO authenticated;
GRANT ALL ON public.pending_users TO service_role;
