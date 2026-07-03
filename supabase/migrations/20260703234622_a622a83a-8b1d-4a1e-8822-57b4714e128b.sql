CREATE OR REPLACE FUNCTION public.user_can_manage_headquarters(_user_id uuid, _headquarters_id uuid)
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
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'igreja_sede'
        AND ur.headquarters_id = _headquarters_id
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_congregation_structure(_user_id uuid, _congregation_id uuid)
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
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'secretario_ebd'
            AND ur.congregation_id = c.id
        )
      )
  );
$$;

DROP POLICY IF EXISTS "headquarters scoped update" ON public.headquarters;
CREATE POLICY "headquarters scoped update"
ON public.headquarters
FOR UPDATE
TO authenticated
USING (public.user_can_manage_headquarters(auth.uid(), id))
WITH CHECK (public.user_can_manage_headquarters(auth.uid(), id));

DROP POLICY IF EXISTS "congregations scoped update" ON public.congregations;
CREATE POLICY "congregations scoped update"
ON public.congregations
FOR UPDATE
TO authenticated
USING (public.user_can_manage_congregation_structure(auth.uid(), id))
WITH CHECK (public.user_can_manage_congregation_structure(auth.uid(), id));