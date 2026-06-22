
-- 1) Tighten students policies: remove NULL bypass branches
DROP POLICY IF EXISTS "students scope select" ON public.students;
DROP POLICY IF EXISTS "students scope delete" ON public.students;
DROP POLICY IF EXISTS "students scope insert" ON public.students;

CREATE POLICY "students scope select" ON public.students
FOR SELECT TO authenticated
USING (
  class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = students.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
);

CREATE POLICY "students scope insert" ON public.students
FOR INSERT TO authenticated
WITH CHECK (
  class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = students.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
);

CREATE POLICY "students scope delete" ON public.students
FOR DELETE TO authenticated
USING (
  class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = students.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
);

-- 2) Tighten registrations policies: remove NULL bypass branches
DROP POLICY IF EXISTS "registrations scope select" ON public.registrations;
DROP POLICY IF EXISTS "registrations scope insert" ON public.registrations;
DROP POLICY IF EXISTS "registrations scope delete" ON public.registrations;

CREATE POLICY "registrations scope select" ON public.registrations
FOR SELECT TO authenticated
USING (
  class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = registrations.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
);

CREATE POLICY "registrations scope insert" ON public.registrations
FOR INSERT TO authenticated
WITH CHECK (
  class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = registrations.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
);

CREATE POLICY "registrations scope delete" ON public.registrations
FOR DELETE TO authenticated
USING (
  class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = registrations.class_id
      AND c.congregation_id IS NOT NULL
      AND public.user_can_see_congregation(auth.uid(), c.congregation_id)
  )
);

-- 3) Tighten classes SELECT/UPDATE to remove NULL bypass (keep master via is_master inside helper)
DROP POLICY IF EXISTS "classes scope select" ON public.classes;
DROP POLICY IF EXISTS "classes scope update" ON public.classes;

CREATE POLICY "classes scope select" ON public.classes
FOR SELECT TO authenticated
USING (
  congregation_id IS NOT NULL
  AND public.user_can_see_congregation(auth.uid(), congregation_id)
);

CREATE POLICY "classes scope update" ON public.classes
FOR UPDATE TO authenticated
USING (
  congregation_id IS NOT NULL
  AND public.user_can_see_congregation(auth.uid(), congregation_id)
)
WITH CHECK (
  congregation_id IS NOT NULL
  AND public.user_can_see_congregation(auth.uid(), congregation_id)
);

-- 4) Storage policies on pix-receipts: scope by congregation folder
DROP POLICY IF EXISTS "Authenticated can view PIX receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload PIX receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete PIX receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update PIX receipts" ON storage.objects;

CREATE POLICY "pix-receipts congregation read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'pix-receipts'
  AND (
    public.is_master(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      AND public.user_can_see_congregation(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "pix-receipts congregation insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pix-receipts'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_can_see_congregation(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "pix-receipts congregation update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'pix-receipts'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_can_see_congregation(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'pix-receipts'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.user_can_see_congregation(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "pix-receipts congregation delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'pix-receipts'
  AND (
    public.is_master(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      AND public.user_can_see_congregation(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);

-- 5) Guard rail: prevent admin_regional roles without a regional_id (scanner warning)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_admin_regional_has_regional'
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_admin_regional_has_regional
    CHECK (role <> 'admin_regional' OR regional_id IS NOT NULL);
  END IF;
END$$;
