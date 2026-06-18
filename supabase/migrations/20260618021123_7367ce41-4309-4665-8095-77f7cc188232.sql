CREATE OR REPLACE FUNCTION public.user_can_manage_headquarters(_user_id uuid, _headquarters_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master(_user_id) OR EXISTS (
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
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_regional(_user_id uuid, _regional_id uuid)
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
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role = 'admin_regional'
            AND ur.regional_id = r.id
        )
      )
  )
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
      )
  )
$$;

DROP POLICY IF EXISTS "headquarters master write" ON public.headquarters;
DROP POLICY IF EXISTS "headquarters master update" ON public.headquarters;
DROP POLICY IF EXISTS "headquarters master delete" ON public.headquarters;
CREATE POLICY "headquarters scoped insert"
ON public.headquarters
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'igreja_mae'
      AND ur.ministry_id = headquarters.ministry_id
  )
);
CREATE POLICY "headquarters scoped update"
ON public.headquarters
FOR UPDATE
TO authenticated
USING (public.user_can_manage_headquarters(auth.uid(), id))
WITH CHECK (
  public.is_master(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'igreja_mae'
      AND ur.ministry_id = headquarters.ministry_id
  )
);
CREATE POLICY "headquarters scoped delete"
ON public.headquarters
FOR DELETE
TO authenticated
USING (public.user_can_manage_headquarters(auth.uid(), id));

DROP POLICY IF EXISTS "regionals master write" ON public.regionals;
DROP POLICY IF EXISTS "regionals master update" ON public.regionals;
DROP POLICY IF EXISTS "regionals master delete" ON public.regionals;
CREATE POLICY "regionals scoped insert"
ON public.regionals
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master(auth.uid()) OR EXISTS (
    SELECT 1
    FROM public.headquarters h
    WHERE h.id = regionals.headquarters_id
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'igreja_mae'
            AND ur.ministry_id = h.ministry_id
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'igreja_sede'
            AND ur.headquarters_id = h.id
        )
      )
  )
);
CREATE POLICY "regionals scoped update"
ON public.regionals
FOR UPDATE
TO authenticated
USING (public.user_can_manage_regional(auth.uid(), id))
WITH CHECK (
  public.is_master(auth.uid()) OR EXISTS (
    SELECT 1
    FROM public.headquarters h
    WHERE h.id = regionals.headquarters_id
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'igreja_mae'
            AND ur.ministry_id = h.ministry_id
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'igreja_sede'
            AND ur.headquarters_id = h.id
        )
      )
  )
);
CREATE POLICY "regionals scoped delete"
ON public.regionals
FOR DELETE
TO authenticated
USING (public.user_can_manage_regional(auth.uid(), id));

DROP POLICY IF EXISTS "congregations master write" ON public.congregations;
DROP POLICY IF EXISTS "congregations master update" ON public.congregations;
DROP POLICY IF EXISTS "congregations master delete" ON public.congregations;
CREATE POLICY "congregations scoped insert"
ON public.congregations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master(auth.uid()) OR EXISTS (
    SELECT 1
    FROM public.headquarters h
    WHERE h.id = congregations.headquarters_id
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'igreja_mae'
            AND ur.ministry_id = h.ministry_id
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'igreja_sede'
            AND ur.headquarters_id = h.id
        )
      )
  )
  AND (
    congregations.regional_id IS NULL
    OR public.user_can_manage_regional(auth.uid(), congregations.regional_id)
  )
);
CREATE POLICY "congregations scoped update"
ON public.congregations
FOR UPDATE
TO authenticated
USING (public.user_can_manage_congregation_structure(auth.uid(), id))
WITH CHECK (
  public.is_master(auth.uid()) OR EXISTS (
    SELECT 1
    FROM public.headquarters h
    WHERE h.id = congregations.headquarters_id
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'igreja_mae'
            AND ur.ministry_id = h.ministry_id
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'igreja_sede'
            AND ur.headquarters_id = h.id
        )
      )
  )
  AND (
    congregations.regional_id IS NULL
    OR public.user_can_manage_regional(auth.uid(), congregations.regional_id)
  )
);
CREATE POLICY "congregations scoped delete"
ON public.congregations
FOR DELETE
TO authenticated
USING (public.user_can_manage_congregation_structure(auth.uid(), id));

DROP POLICY IF EXISTS "classes scope update" ON public.classes;
CREATE POLICY "classes scope update"
ON public.classes
FOR UPDATE
TO authenticated
USING ((congregation_id IS NULL) OR public.user_can_see_congregation(auth.uid(), congregation_id))
WITH CHECK ((congregation_id IS NOT NULL) AND public.user_can_see_congregation(auth.uid(), congregation_id));

DROP POLICY IF EXISTS "students scope update" ON public.students;
CREATE POLICY "students scope update"
ON public.students
FOR UPDATE
TO authenticated
USING (
  class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = students.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
)
WITH CHECK (
  class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = students.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
);

DROP POLICY IF EXISTS "registrations scope update" ON public.registrations;
CREATE POLICY "registrations scope update"
ON public.registrations
FOR UPDATE
TO authenticated
USING (
  class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = registrations.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
)
WITH CHECK (
  class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = registrations.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
);