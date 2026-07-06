DROP POLICY IF EXISTS "students scope select" ON public.students;
DROP POLICY IF EXISTS "students scope update" ON public.students;
DROP POLICY IF EXISTS "students scope delete" ON public.students;

CREATE POLICY "students scope select" ON public.students FOR SELECT
USING (
  (class_id IS NOT NULL) AND (
    public.teacher_has_class(auth.uid(), class_id)
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = students.class_id
        AND c.congregation_id IS NOT NULL
        AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
    )
  )
);

CREATE POLICY "students scope update" ON public.students FOR UPDATE
USING (
  (class_id IS NOT NULL) AND (
    public.teacher_has_class(auth.uid(), class_id)
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = students.class_id
        AND c.congregation_id IS NOT NULL
        AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
    )
  )
);

CREATE POLICY "students scope delete" ON public.students FOR DELETE
USING (
  (class_id IS NOT NULL) AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = students.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
);