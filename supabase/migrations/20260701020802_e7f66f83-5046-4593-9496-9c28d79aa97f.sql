
GRANT EXECUTE ON FUNCTION public.is_master(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_see_congregation(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_headquarters(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_regional(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_congregation_structure(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_has_class(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_ministry(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_headquarters(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_regional(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_congregation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary(integer[], date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_trends(integer[], timestamptz, timestamptz, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_user(uuid, text, uuid, uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_user(uuid) TO authenticated, service_role;
