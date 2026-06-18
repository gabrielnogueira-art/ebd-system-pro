REVOKE EXECUTE ON FUNCTION public.user_can_manage_headquarters(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_can_manage_regional(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_can_manage_congregation_structure(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.user_can_manage_headquarters(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_regional(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_congregation_structure(uuid, uuid) TO authenticated, service_role;