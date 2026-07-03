CREATE OR REPLACE FUNCTION public.user_can_delete_headquarters(_user_id uuid, _headquarters_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.headquarters h
      WHERE h.id = _headquarters_id
        AND EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'igreja_mae'
            AND ur.ministry_id = h.ministry_id
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_delete_regional(_user_id uuid, _regional_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(_user_id) OR EXISTS (
    SELECT 1
    FROM public.regionals r
    JOIN public.headquarters h ON h.id = r.headquarters_id
    WHERE r.id = _regional_id
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'igreja_mae'
            AND ur.ministry_id = h.ministry_id
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'igreja_sede'
            AND ur.headquarters_id = h.id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_delete_congregation(_user_id uuid, _congregation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(_user_id) OR EXISTS (
    SELECT 1
    FROM public.congregations c
    JOIN public.headquarters h ON h.id = c.headquarters_id
    WHERE c.id = _congregation_id
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'igreja_mae'
            AND ur.ministry_id = h.ministry_id
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'igreja_sede'
            AND ur.headquarters_id = h.id
        )
        OR (
          c.regional_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = _user_id
              AND ur.role = 'admin_regional'
              AND ur.regional_id = c.regional_id
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS "headquarters scoped delete" ON public.headquarters;
CREATE POLICY "headquarters scoped delete"
ON public.headquarters
FOR DELETE
TO authenticated
USING (public.user_can_delete_headquarters(auth.uid(), id));

DROP POLICY IF EXISTS "regionals scoped delete" ON public.regionals;
CREATE POLICY "regionals scoped delete"
ON public.regionals
FOR DELETE
TO authenticated
USING (public.user_can_delete_regional(auth.uid(), id));

DROP POLICY IF EXISTS "congregations scoped delete" ON public.congregations;
CREATE POLICY "congregations scoped delete"
ON public.congregations
FOR DELETE
TO authenticated
USING (public.user_can_delete_congregation(auth.uid(), id));

GRANT EXECUTE ON FUNCTION public.user_can_delete_headquarters(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_delete_regional(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_delete_congregation(uuid, uuid) TO authenticated, service_role;