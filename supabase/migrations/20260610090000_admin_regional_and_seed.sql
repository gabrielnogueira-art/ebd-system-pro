-- admin_regional + RLS bottom-up real + seed de usuarios de teste

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_regional';

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS regional_id uuid REFERENCES public.regionals(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_regional(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT regional_id FROM public.user_roles
  WHERE user_id = _user_id AND regional_id IS NOT NULL LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_can_see_congregation(_user_id uuid, _congregation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.congregations c
    JOIN public.headquarters h ON h.id = c.headquarters_id
    WHERE c.id = _congregation_id AND (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.ministry_id = h.ministry_id)
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.headquarters_id = h.id)
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.regional_id = c.regional_id)
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.congregation_id = c.id)
    )
  )
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.classes TO service_role;
GRANT ALL ON public.students TO service_role;
GRANT ALL ON public.registrations TO service_role;

DROP POLICY IF EXISTS "Anyone can view classes" ON public.classes;
DROP POLICY IF EXISTS "Anyone can view students" ON public.students;
DROP POLICY IF EXISTS "Anyone can view registrations" ON public.registrations;
DROP POLICY IF EXISTS "Anyone can insert registrations" ON public.registrations;
DROP POLICY IF EXISTS "Anyone can update registrations" ON public.registrations;

DROP POLICY IF EXISTS "classes anon read" ON public.classes;
DROP POLICY IF EXISTS "classes scope select" ON public.classes;
DROP POLICY IF EXISTS "classes scope insert" ON public.classes;
DROP POLICY IF EXISTS "classes scope update" ON public.classes;
DROP POLICY IF EXISTS "classes scope delete" ON public.classes;
DROP POLICY IF EXISTS "students anon read" ON public.students;
DROP POLICY IF EXISTS "students scope select" ON public.students;
DROP POLICY IF EXISTS "students scope insert" ON public.students;
DROP POLICY IF EXISTS "students scope update" ON public.students;
DROP POLICY IF EXISTS "students scope delete" ON public.students;
DROP POLICY IF EXISTS "registrations anon read" ON public.registrations;
DROP POLICY IF EXISTS "registrations scope select" ON public.registrations;
DROP POLICY IF EXISTS "registrations scope insert" ON public.registrations;
DROP POLICY IF EXISTS "registrations scope update" ON public.registrations;
DROP POLICY IF EXISTS "registrations scope delete" ON public.registrations;

CREATE POLICY "classes anon read" ON public.classes FOR SELECT TO anon USING (true);
CREATE POLICY "classes scope select" ON public.classes FOR SELECT TO authenticated
  USING (congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), congregation_id));
CREATE POLICY "classes scope insert" ON public.classes FOR INSERT TO authenticated
  WITH CHECK (congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), congregation_id));
CREATE POLICY "classes scope update" ON public.classes FOR UPDATE TO authenticated
  USING (congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), congregation_id));
CREATE POLICY "classes scope delete" ON public.classes FOR DELETE TO authenticated
  USING (congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), congregation_id));

CREATE POLICY "students anon read" ON public.students FOR SELECT TO anon USING (true);
CREATE POLICY "students scope select" ON public.students FOR SELECT TO authenticated
  USING (class_id IS NULL OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id
    AND (c.congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), c.congregation_id))));
CREATE POLICY "students scope insert" ON public.students FOR INSERT TO authenticated
  WITH CHECK (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id
    AND c.congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), c.congregation_id)));
CREATE POLICY "students scope update" ON public.students FOR UPDATE TO authenticated
  USING (class_id IS NULL OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id
    AND (c.congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), c.congregation_id))));
CREATE POLICY "students scope delete" ON public.students FOR DELETE TO authenticated
  USING (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id
    AND c.congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), c.congregation_id)));

CREATE POLICY "registrations anon read" ON public.registrations FOR SELECT TO anon USING (true);
CREATE POLICY "registrations scope select" ON public.registrations FOR SELECT TO authenticated
  USING (class_id IS NULL OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = registrations.class_id
    AND (c.congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), c.congregation_id))));
CREATE POLICY "registrations scope insert" ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = registrations.class_id
    AND c.congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), c.congregation_id)));
CREATE POLICY "registrations scope update" ON public.registrations FOR UPDATE TO authenticated
  USING (class_id IS NULL OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = registrations.class_id
    AND (c.congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), c.congregation_id))));
CREATE POLICY "registrations scope delete" ON public.registrations FOR DELETE TO authenticated
  USING (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = registrations.class_id
    AND c.congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), c.congregation_id)));

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $seed$
DECLARE
  v_users CONSTANT jsonb := jsonb_build_array(
    jsonb_build_object('id','aaaaaaaa-0000-0000-0000-000000000001','email','admin_ministerio@teste.com'),
    jsonb_build_object('id','aaaaaaaa-0000-0000-0000-000000000002','email','admin_igreja_mae@teste.com'),
    jsonb_build_object('id','aaaaaaaa-0000-0000-0000-000000000003','email','admin_regional@teste.com'),
    jsonb_build_object('id','aaaaaaaa-0000-0000-0000-000000000004','email','admin_congregacao@teste.com'),
    jsonb_build_object('id','aaaaaaaa-0000-0000-0000-000000000005','email','professor_classe@teste.com')
  );
  r jsonb; v_uid uuid; v_email text;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(v_users) LOOP
    v_uid := (r->>'id')::uuid;
    v_email := r->>'email';
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, crypt('senha123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email),
      'email', v_uid::text, now(), now(), now()
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END
$seed$;
