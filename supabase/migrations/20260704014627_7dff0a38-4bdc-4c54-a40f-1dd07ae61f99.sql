
-- 1) Permitir que professor_classe VEJA a classe à qual está vinculado
DROP POLICY IF EXISTS "classes scope select" ON public.classes;
CREATE POLICY "classes scope select"
ON public.classes
FOR SELECT
USING (
  (congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), congregation_id))
  OR public.teacher_has_class(auth.uid(), id)
);

-- 2) Função SECURITY DEFINER que devolve os logins vinculados às classes,
--    validando permissão do chamador por classe (via congregação da classe).
CREATE OR REPLACE FUNCTION public.get_class_logins(_class_ids integer[])
RETURNS TABLE (class_id integer, user_id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  RETURN QUERY
  SELECT tc.class_id, tc.user_id, pu.email
  FROM public.teacher_classes tc
  JOIN public.classes c ON c.id = tc.class_id
  JOIN public.user_roles ur ON ur.user_id = tc.user_id AND ur.role = 'professor_classe'
  LEFT JOIN public.pending_users pu ON pu.user_id = tc.user_id
  WHERE tc.class_id = ANY(_class_ids)
    AND c.congregation_id IS NOT NULL
    AND public.user_can_manage_congregation_structure(auth.uid(), c.congregation_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_class_logins(integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_logins(integer[]) TO authenticated, service_role;
