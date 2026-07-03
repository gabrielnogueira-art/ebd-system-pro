DROP POLICY IF EXISTS "ministries public read" ON public.ministries;
DROP POLICY IF EXISTS "read ministries" ON public.ministries;
DROP POLICY IF EXISTS "headquarters public read" ON public.headquarters;
DROP POLICY IF EXISTS "read headquarters" ON public.headquarters;
DROP POLICY IF EXISTS "congregations public read" ON public.congregations;
DROP POLICY IF EXISTS "read congregations" ON public.congregations;
DROP POLICY IF EXISTS "regionals public read" ON public.regionals;
DROP POLICY IF EXISTS "read regionals" ON public.regionals;

CREATE OR REPLACE FUNCTION public.user_can_see_ministry(_user_id uuid, _ministry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'igreja_mae'
        AND ur.ministry_id = _ministry_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.headquarters h ON h.id = ur.headquarters_id
      WHERE ur.user_id = _user_id
        AND ur.role = 'igreja_sede'
        AND h.ministry_id = _ministry_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.regionals r ON r.id = ur.regional_id
      JOIN public.headquarters h ON h.id = r.headquarters_id
      WHERE ur.user_id = _user_id
        AND ur.role = 'admin_regional'
        AND h.ministry_id = _ministry_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.congregations c ON c.id = ur.congregation_id
      JOIN public.headquarters h ON h.id = c.headquarters_id
      WHERE ur.user_id = _user_id
        AND ur.role = 'secretario_ebd'
        AND h.ministry_id = _ministry_id
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_see_headquarters(_user_id uuid, _headquarters_id uuid)
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
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.regionals r ON r.id = ur.regional_id
      WHERE ur.user_id = _user_id
        AND ur.role = 'admin_regional'
        AND r.headquarters_id = _headquarters_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.congregations c ON c.id = ur.congregation_id
      WHERE ur.user_id = _user_id
        AND ur.role = 'secretario_ebd'
        AND c.headquarters_id = _headquarters_id
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_see_regional(_user_id uuid, _regional_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.regionals r
      JOIN public.headquarters h ON h.id = r.headquarters_id
      WHERE r.id = _regional_id
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
      FROM public.regionals r
      WHERE r.id = _regional_id
        AND EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'igreja_sede'
            AND ur.headquarters_id = r.headquarters_id
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'admin_regional'
        AND ur.regional_id = _regional_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.congregations c ON c.id = ur.congregation_id
      WHERE ur.user_id = _user_id
        AND ur.role = 'secretario_ebd'
        AND c.regional_id = _regional_id
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_see_congregation(_user_id uuid, _congregation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.congregations c
      JOIN public.headquarters h ON h.id = c.headquarters_id
      WHERE c.id = _congregation_id
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
      FROM public.congregations c
      WHERE c.id = _congregation_id
        AND EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'igreja_sede'
            AND ur.headquarters_id = c.headquarters_id
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.congregations c
      WHERE c.id = _congregation_id
        AND c.regional_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'admin_regional'
            AND ur.regional_id = c.regional_id
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'secretario_ebd'
        AND ur.congregation_id = _congregation_id
    );
$$;

CREATE POLICY "ministries scoped read"
ON public.ministries
FOR SELECT
TO authenticated
USING (public.user_can_see_ministry(auth.uid(), id));

CREATE POLICY "headquarters scoped read"
ON public.headquarters
FOR SELECT
TO authenticated
USING (public.user_can_see_headquarters(auth.uid(), id));

CREATE POLICY "regionals scoped read"
ON public.regionals
FOR SELECT
TO authenticated
USING (public.user_can_see_regional(auth.uid(), id));

CREATE POLICY "congregations scoped read"
ON public.congregations
FOR SELECT
TO authenticated
USING (public.user_can_see_congregation(auth.uid(), id));

GRANT EXECUTE ON FUNCTION public.user_can_see_ministry(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_see_headquarters(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_see_regional(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_see_congregation(uuid, uuid) TO authenticated, service_role;