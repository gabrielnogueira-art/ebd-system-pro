

-- ========================================================
-- MIGRATION: 20260405232520_9393e4e1-4ec2-4679-b5ab-ff2d71d63c36.sql
-- ========================================================

ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS reconciled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cash_difference numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pix_difference numeric DEFAULT 0;

-- ========================================================
-- MIGRATION: 20260608052300_hierarchy_and_rbac.sql
-- ========================================================

-- Fase 1: Hierarquia (Ministerio -> Sede -> Regional -> Congregacao) + RBAC

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('secretario_ebd', 'professor_classe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ministries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.headquarters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headquarters_id uuid NOT NULL REFERENCES public.headquarters(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.congregations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_id uuid REFERENCES public.regionals(id) ON DELETE SET NULL,
  headquarters_id uuid NOT NULL REFERENCES public.headquarters(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_headquarters boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ministries TO anon, authenticated;
GRANT SELECT ON public.headquarters TO anon, authenticated;
GRANT SELECT ON public.regionals TO anon, authenticated;
GRANT SELECT ON public.congregations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ministries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.headquarters TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.regionals TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.congregations TO authenticated;
GRANT ALL ON public.ministries TO service_role;
GRANT ALL ON public.headquarters TO service_role;
GRANT ALL ON public.regionals TO service_role;
GRANT ALL ON public.congregations TO service_role;

ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.headquarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.congregations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read ministries" ON public.ministries;
CREATE POLICY "read ministries" ON public.ministries FOR SELECT USING (true);
DROP POLICY IF EXISTS "read headquarters" ON public.headquarters;
CREATE POLICY "read headquarters" ON public.headquarters FOR SELECT USING (true);
DROP POLICY IF EXISTS "read regionals" ON public.regionals;
CREATE POLICY "read regionals" ON public.regionals FOR SELECT USING (true);
DROP POLICY IF EXISTS "read congregations" ON public.congregations;
CREATE POLICY "read congregations" ON public.congregations FOR SELECT USING (true);

INSERT INTO public.ministries (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Ministerio Padrao')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.headquarters (id, ministry_id, name)
VALUES ('00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'Igreja Sede')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.congregations (id, headquarters_id, name, is_headquarters)
VALUES ('00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000002',
        'Congregacao Padrao', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS congregation_id uuid REFERENCES public.congregations(id) ON DELETE SET NULL;

UPDATE public.classes
SET congregation_id = '00000000-0000-0000-0000-000000000003'
WHERE congregation_id IS NULL;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  congregation_id uuid REFERENCES public.congregations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, congregation_id)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own roles" ON public.user_roles;
CREATE POLICY "user reads own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.teacher_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id integer NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, class_id)
);

GRANT SELECT ON public.teacher_classes TO authenticated;
GRANT ALL ON public.teacher_classes TO service_role;

ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own teacher_classes" ON public.teacher_classes;
CREATE POLICY "user reads own teacher_classes"
  ON public.teacher_classes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_congregation(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT congregation_id FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.teacher_has_class(_user_id uuid, _class_id integer)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_classes
    WHERE user_id = _user_id AND class_id = _class_id
  )
$$;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS cargo text;


-- ========================================================
-- MIGRATION: 20260608054408_hierarchy_write_policies.sql
-- ========================================================

-- Permitir que usuarios autenticados gerenciem a hierarquia
DROP POLICY IF EXISTS "auth manage ministries" ON public.ministries;
CREATE POLICY "auth manage ministries"
  ON public.ministries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth manage headquarters" ON public.headquarters;
CREATE POLICY "auth manage headquarters"
  ON public.headquarters FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth manage regionals" ON public.regionals;
CREATE POLICY "auth manage regionals"
  ON public.regionals FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth manage congregations" ON public.congregations;
CREATE POLICY "auth manage congregations"
  ON public.congregations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- ========================================================
-- MIGRATION: 20260609060000_multitenant_scopes.sql
-- ========================================================

-- Iteracao 1: Expandir roles e escopos para multi-tenant (Ministerio/Sede/Congregacao)

-- 1) Novos valores no enum app_role (idempotente)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'igreja_mae';
COMMIT;
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'igreja_sede';
COMMIT;

-- 2) Colunas de escopo em user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS ministry_id uuid REFERENCES public.ministries(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS headquarters_id uuid REFERENCES public.headquarters(id) ON DELETE CASCADE;

-- 3) Funcoes security definer para escopo
CREATE OR REPLACE FUNCTION public.get_user_ministry(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ministry_id FROM public.user_roles
  WHERE user_id = _user_id AND ministry_id IS NOT NULL
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_headquarters(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT headquarters_id FROM public.user_roles
  WHERE user_id = _user_id AND headquarters_id IS NOT NULL
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_can_see_congregation(_user_id uuid, _congregation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.congregations c
    JOIN public.headquarters h ON h.id = c.headquarters_id
    WHERE c.id = _congregation_id
      AND (
        EXISTS (SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = _user_id
                   AND ur.ministry_id = h.ministry_id)
        OR EXISTS (SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = _user_id
                      AND ur.headquarters_id = h.id)
        OR EXISTS (SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = _user_id
                      AND ur.congregation_id = c.id)
      )
  )
$$;

-- 4) Seed: 2a Igreja Sede ("Sede Norte") + Regionais + Congregacoes
INSERT INTO public.headquarters (id, ministry_id, name, city)
VALUES ('00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000001',
        'Sede Norte', 'Cidade Norte')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.regionals (id, headquarters_id, name)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'Regional Norte A'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', 'Regional Norte B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.congregations (id, regional_id, headquarters_id, name, is_headquarters)
VALUES
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'Sede Norte (Local)', true),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', 'Congregacao Alvorada', false),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000010', 'Congregacao Bela Vista', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.regionals (id, headquarters_id, name)
VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'Regional Central')
ON CONFLICT (id) DO NOTHING;

UPDATE public.congregations
SET regional_id = '00000000-0000-0000-0000-000000000020'
WHERE id = '00000000-0000-0000-0000-000000000003'
  AND regional_id IS NULL;


-- ========================================================
-- MIGRATION: 20260610090000_admin_regional_and_seed.sql
-- ========================================================

-- admin_regional + RLS bottom-up real + seed de usuarios de teste

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_regional';
COMMIT;

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

DROP POLICY IF EXISTS "classes anon read" ON public.classes;
CREATE POLICY "classes anon read" ON public.classes FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "classes scope select" ON public.classes;
CREATE POLICY "classes scope select" ON public.classes FOR SELECT TO authenticated
  USING (congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), congregation_id));
DROP POLICY IF EXISTS "classes scope insert" ON public.classes;
CREATE POLICY "classes scope insert" ON public.classes FOR INSERT TO authenticated
  WITH CHECK (congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), congregation_id));
DROP POLICY IF EXISTS "classes scope update" ON public.classes;
CREATE POLICY "classes scope update" ON public.classes FOR UPDATE TO authenticated
  USING (congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), congregation_id));
DROP POLICY IF EXISTS "classes scope delete" ON public.classes;
CREATE POLICY "classes scope delete" ON public.classes FOR DELETE TO authenticated
  USING (congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), congregation_id));

DROP POLICY IF EXISTS "students anon read" ON public.students;
CREATE POLICY "students anon read" ON public.students FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "students scope select" ON public.students;
CREATE POLICY "students scope select" ON public.students FOR SELECT TO authenticated
  USING (class_id IS NULL OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id
    AND (c.congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), c.congregation_id))));
DROP POLICY IF EXISTS "students scope insert" ON public.students;
CREATE POLICY "students scope insert" ON public.students FOR INSERT TO authenticated
  WITH CHECK (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id
    AND c.congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), c.congregation_id)));
DROP POLICY IF EXISTS "students scope update" ON public.students;
CREATE POLICY "students scope update" ON public.students FOR UPDATE TO authenticated
  USING (class_id IS NULL OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id
    AND (c.congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), c.congregation_id))));
DROP POLICY IF EXISTS "students scope delete" ON public.students;
CREATE POLICY "students scope delete" ON public.students FOR DELETE TO authenticated
  USING (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = students.class_id
    AND c.congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), c.congregation_id)));

DROP POLICY IF EXISTS "registrations anon read" ON public.registrations;
CREATE POLICY "registrations anon read" ON public.registrations FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "registrations scope select" ON public.registrations;
CREATE POLICY "registrations scope select" ON public.registrations FOR SELECT TO authenticated
  USING (class_id IS NULL OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = registrations.class_id
    AND (c.congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), c.congregation_id))));
DROP POLICY IF EXISTS "registrations scope insert" ON public.registrations;
CREATE POLICY "registrations scope insert" ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = registrations.class_id
    AND c.congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), c.congregation_id)));
DROP POLICY IF EXISTS "registrations scope update" ON public.registrations;
CREATE POLICY "registrations scope update" ON public.registrations FOR UPDATE TO authenticated
  USING (class_id IS NULL OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = registrations.class_id
    AND (c.congregation_id IS NULL OR public.user_can_see_congregation(auth.uid(), c.congregation_id))));
DROP POLICY IF EXISTS "registrations scope delete" ON public.registrations;
CREATE POLICY "registrations scope delete" ON public.registrations FOR DELETE TO authenticated
  USING (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = registrations.class_id
    AND c.congregation_id IS NOT NULL AND public.user_can_see_congregation(auth.uid(), c.congregation_id)));

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SELECT setval(pg_get_serial_sequence('public.classes', 'id'), coalesce(max(id), 0) + 1, false) FROM public.classes;

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


-- ========================================================
-- MIGRATION: 20260610090100_seed_test_user_roles.sql
-- ========================================================

-- Vincular roles e escopos aos usuarios de teste (separado por causa de ALTER TYPE ADD VALUE)

INSERT INTO public.user_roles (user_id, role, ministry_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'igreja_mae', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role, headquarters_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000002', 'igreja_sede', '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role, regional_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000003', 'admin_regional', '00000000-0000-0000-0000-000000000020')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role, congregation_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000004', 'secretario_ebd', '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role, congregation_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000005', 'professor_classe', '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

INSERT INTO public.teacher_classes (user_id, class_id)
SELECT 'aaaaaaaa-0000-0000-0000-000000000005', c.id
FROM public.classes c
WHERE c.congregation_id = '00000000-0000-0000-0000-000000000003'
ORDER BY c.id ASC LIMIT 1
ON CONFLICT DO NOTHING;


-- ========================================================
-- MIGRATION: 20260615120000_master_and_approval.sql
-- ========================================================

-- Master role + fluxo de aprovacao de usuarios

-- 1) Novo valor de enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'master';
COMMIT;

-- 2) Coluna city em ministries
ALTER TABLE public.ministries
  ADD COLUMN IF NOT EXISTS city text;

-- 3) Funcao is_master
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'master')
$$;

-- 4) user_can_see_congregation: master enxerga tudo
CREATE OR REPLACE FUNCTION public.user_can_see_congregation(_user_id uuid, _congregation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_master(_user_id) OR EXISTS (
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

-- 5) Tabela pending_users
CREATE TABLE IF NOT EXISTS public.pending_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  requested_role text,
  requested_ministry_id uuid REFERENCES public.ministries(id) ON DELETE SET NULL,
  requested_headquarters_id uuid REFERENCES public.headquarters(id) ON DELETE SET NULL,
  requested_regional_id uuid REFERENCES public.regionals(id) ON DELETE SET NULL,
  requested_congregation_id uuid REFERENCES public.congregations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pending_users TO authenticated;
GRANT ALL ON public.pending_users TO service_role;

ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending self read" ON public.pending_users;
DROP POLICY IF EXISTS "pending master read" ON public.pending_users;
DROP POLICY IF EXISTS "pending master update" ON public.pending_users;
DROP POLICY IF EXISTS "pending self insert" ON public.pending_users;

DROP POLICY IF EXISTS "pending self read" ON public.pending_users;
CREATE POLICY "pending self read" ON public.pending_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_master(auth.uid()));

DROP POLICY IF EXISTS "pending master update" ON public.pending_users;
CREATE POLICY "pending master update" ON public.pending_users
  FOR UPDATE TO authenticated
  USING (public.is_master(auth.uid()));

DROP POLICY IF EXISTS "pending self insert" ON public.pending_users;
CREATE POLICY "pending self insert" ON public.pending_users
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_master(auth.uid()));

-- 6) Trigger no signup: cria pending automatico
CREATE OR REPLACE FUNCTION public.handle_new_user_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pending_users (user_id, email, display_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    'pending'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_pending ON auth.users;
CREATE TRIGGER on_auth_user_created_pending
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_pending();

-- 7) Funcao approve_user (chamada do front por master)
CREATE OR REPLACE FUNCTION public.approve_user(
  _pending_id uuid,
  _role text,
  _ministry_id uuid DEFAULT NULL,
  _headquarters_id uuid DEFAULT NULL,
  _regional_id uuid DEFAULT NULL,
  _congregation_id uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid;
BEGIN
  IF NOT public.is_master(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas usuarios master podem aprovar';
  END IF;

  SELECT user_id INTO v_uid FROM public.pending_users WHERE id = _pending_id;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Pending nao encontrado'; END IF;

  INSERT INTO public.user_roles (user_id, role, ministry_id, headquarters_id, regional_id, congregation_id)
  VALUES (v_uid, _role::public.app_role, _ministry_id, _headquarters_id, _regional_id, _congregation_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.pending_users
  SET status = 'approved', decided_by = auth.uid(), decided_at = now()
  WHERE id = _pending_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_user(_pending_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_master(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas usuarios master podem rejeitar';
  END IF;
  UPDATE public.pending_users
  SET status = 'rejected', decided_by = auth.uid(), decided_at = now()
  WHERE id = _pending_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_user(uuid, text, uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user(uuid) TO authenticated;


-- ========================================================
-- MIGRATION: 20260615120100_seed_madureira.sql
-- ========================================================

-- Seed: Master + Ministerio Madureira + 3 Sedes + 12 Regionais + 120 Congregacoes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper idempotente: cria ou corrige senha dos auth.users iniciais
DO $blk$
DECLARE
  v_users CONSTANT jsonb := jsonb_build_array(
    jsonb_build_object('id','bbbbbbbb-0000-0000-0000-000000000001','email','master@ebd.dev','pwd','Master@2026'),
    jsonb_build_object('id','bbbbbbbb-0000-0000-0000-000000000002','email','admadureira@gmail.com','pwd','Admadureira@2026')
  );
  r jsonb; v_uid uuid; v_email text; v_pwd text; v_existing uuid;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(v_users) LOOP
    v_uid := (r->>'id')::uuid;
    v_email := r->>'email';
    v_pwd := r->>'pwd';

    SELECT id INTO v_existing FROM auth.users WHERE lower(email) = lower(v_email) LIMIT 1;
    IF v_existing IS NULL THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
        v_email, crypt(v_pwd, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        '', '', '', ''
      );
      v_existing := v_uid;
    ELSE
      UPDATE auth.users
         SET encrypted_password = crypt(v_pwd, gen_salt('bf')),
             email_confirmed_at = COALESCE(email_confirmed_at, now()),
             updated_at = now(),
             raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
       WHERE id = v_existing;
    END IF;

    DELETE FROM auth.identities
    WHERE user_id = v_existing AND provider = 'email';

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_existing, v_existing,
      jsonb_build_object('sub', v_existing::text, 'email', v_email),
      'email', v_existing::text, now(), now(), now()
    );
  END LOOP;
END
$blk$;

-- Ministerio Madureira
INSERT INTO public.ministries (id, name, city)
VALUES ('cccccccc-0000-0000-0000-000000000001',
        'Assembleia de Deus Ministério Madureira',
        'Rio de Janeiro')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city;

-- Master role + auto-aprovado
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'master'::public.app_role
FROM auth.users u
WHERE lower(u.email) = lower('master@ebd.dev')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role::text = 'master');

INSERT INTO public.pending_users (user_id, email, display_name, status, decided_at)
SELECT u.id, 'master@ebd.dev', 'Master Developer', 'approved', now()
FROM auth.users u
WHERE lower(u.email) = lower('master@ebd.dev')
  AND NOT EXISTS (SELECT 1 FROM public.pending_users pu WHERE pu.user_id = u.id);

UPDATE public.pending_users
SET status = 'approved', decided_at = COALESCE(decided_at, now())
WHERE lower(email) = lower('master@ebd.dev');

-- AD Madureira -> igreja_mae
INSERT INTO public.user_roles (user_id, role, ministry_id)
SELECT u.id, 'igreja_mae'::public.app_role, 'cccccccc-0000-0000-0000-000000000001'::uuid
FROM auth.users u
WHERE lower(u.email) = lower('admadureira@gmail.com')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role::text = 'igreja_mae');

INSERT INTO public.pending_users (user_id, email, display_name, status, decided_at)
SELECT u.id, 'admadureira@gmail.com', 'AD Madureira', 'approved', now()
FROM auth.users u
WHERE lower(u.email) = lower('admadureira@gmail.com')
  AND NOT EXISTS (SELECT 1 FROM public.pending_users pu WHERE pu.user_id = u.id);

UPDATE public.pending_users
SET status = 'approved', decided_at = COALESCE(decided_at, now())
WHERE lower(email) = lower('admadureira@gmail.com');

-- 3 Igrejas Sede
INSERT INTO public.headquarters (id, ministry_id, name, city) VALUES
  ('cccccccc-0000-0000-0000-000000000101', 'cccccccc-0000-0000-0000-000000000001', 'AD Campos dos Goytacazes', 'Campos dos Goytacazes'),
  ('cccccccc-0000-0000-0000-000000000102', 'cccccccc-0000-0000-0000-000000000001', 'AD Macaé', 'Macaé'),
  ('cccccccc-0000-0000-0000-000000000103', 'cccccccc-0000-0000-0000-000000000001', 'AD São Francisco de Itabapoana', 'São Francisco de Itabapoana')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, ministry_id = EXCLUDED.ministry_id;

-- Reassocia o admin existente (admin_igreja_mae@teste.com -> id aaaaaaaa-0000-0000-0000-000000000002)
-- para ser admin da AD Campos dos Goytacazes
UPDATE public.user_roles
SET headquarters_id = 'cccccccc-0000-0000-0000-000000000101'
WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000002'
  AND role = 'igreja_sede';

-- 12 Regionais e 120 Congregacoes sob AD Campos
SELECT setval(pg_get_serial_sequence('public.classes', 'id'), coalesce(max(id), 0) + 1, false) FROM public.classes;

DO $seed$
DECLARE
  v_hq CONSTANT uuid := 'cccccccc-0000-0000-0000-000000000101';
  i int; j int;
  v_reg_id uuid;
  v_cong_id uuid;
  v_cong_num int := 0;
BEGIN
  FOR i IN 1..12 LOOP
    v_reg_id := ('cccccccc-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid;
    INSERT INTO public.regionals (id, headquarters_id, name)
    VALUES (v_reg_id, v_hq, 'Regional ' || lpad(i::text, 2, '0'))
    ON CONFLICT (id) DO NOTHING;

    FOR j IN 1..10 LOOP
      v_cong_num := v_cong_num + 1;
      v_cong_id := ('cccccccc-0000-0000-0002-' || lpad(v_cong_num::text, 12, '0'))::uuid;
      INSERT INTO public.congregations (id, regional_id, headquarters_id, name, is_headquarters)
      VALUES (v_cong_id, v_reg_id, v_hq, 'Congregação ' || v_cong_num, false)
      ON CONFLICT (id) DO NOTHING;

      -- Classe Geral por congregacao
      IF NOT EXISTS (SELECT 1 FROM public.classes WHERE congregation_id = v_cong_id) THEN
        INSERT INTO public.classes (name, congregation_id)
        VALUES ('Geral', v_cong_id);
      END IF;
    END LOOP;
  END LOOP;
END
$seed$;


-- ========================================================
-- MIGRATION: 20260615130000_promote_real_admin.sql
-- ========================================================

-- Promove a conta real do desenvolvedor a Master + Sede AD Campos
DO $promote$
DECLARE
  v_uid uuid;
  v_hq  uuid := 'cccccccc-0000-0000-0000-000000000101';
BEGIN
  SELECT id INTO v_uid FROM auth.users
   WHERE lower(email) = lower('escola.dominical.adcampos@gmail.com')
   LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE 'Usuario nao encontrado; pulando.';
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'master')
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.headquarters WHERE id = v_hq) THEN
    INSERT INTO public.user_roles (user_id, role, headquarters_id)
    VALUES (v_uid, 'igreja_sede', v_hq)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.pending_users (user_id, email, display_name, status, decided_at)
  VALUES (v_uid, 'escola.dominical.adcampos@gmail.com', 'AD Campos (dev)', 'approved', now())
  ON CONFLICT DO NOTHING;

  UPDATE public.pending_users
     SET status = 'approved', decided_at = COALESCE(decided_at, now())
   WHERE user_id = v_uid AND status <> 'approved';
END
$promote$;


-- ========================================================
-- MIGRATION: 20260615133000_fix_master_ministry_auth_seed.sql
-- ========================================================

-- Corrige/garante os logins iniciais Master e Ministério no Auth conectado.
-- O seed anterior usava ON CONFLICT(id), então não corrigia senha se o usuário já existisse.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $seed_auth$
DECLARE
  v_master_id uuid;
  v_ministry_user_id uuid;
  v_master_email text := 'master@ebd.dev';
  v_ministry_email text := 'admadureira@gmail.com';
  v_ministry_id uuid := 'cccccccc-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO v_master_id FROM auth.users WHERE lower(email) = lower(v_master_email) LIMIT 1;
  IF v_master_id IS NULL THEN
    v_master_id := 'bbbbbbbb-0000-0000-0000-000000000001';
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_master_id, 'authenticated', 'authenticated',
      v_master_email, crypt('Master@2026', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    );
  ELSE
    UPDATE auth.users
       SET encrypted_password = crypt('Master@2026', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now(),
           raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
     WHERE id = v_master_id;
  END IF;

  DELETE FROM auth.identities
  WHERE user_id = v_master_id AND provider = 'email';

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_master_id, v_master_id, jsonb_build_object('sub', v_master_id::text, 'email', v_master_email), 'email', v_master_id::text, now(), now(), now());

  SELECT id INTO v_ministry_user_id FROM auth.users WHERE lower(email) = lower(v_ministry_email) LIMIT 1;
  IF v_ministry_user_id IS NULL THEN
    v_ministry_user_id := 'bbbbbbbb-0000-0000-0000-000000000002';
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_ministry_user_id, 'authenticated', 'authenticated',
      v_ministry_email, crypt('Admadureira@2026', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    );
  ELSE
    UPDATE auth.users
       SET encrypted_password = crypt('Admadureira@2026', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now(),
           raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
     WHERE id = v_ministry_user_id;
  END IF;

  DELETE FROM auth.identities
  WHERE user_id = v_ministry_user_id AND provider = 'email';

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_ministry_user_id, v_ministry_user_id, jsonb_build_object('sub', v_ministry_user_id::text, 'email', v_ministry_email), 'email', v_ministry_user_id::text, now(), now(), now());

  INSERT INTO public.ministries (id, name, city)
  VALUES (v_ministry_id, 'Assembleia de Deus Ministério Madureira', 'Rio de Janeiro')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city;

  INSERT INTO public.user_roles (user_id, role)
  SELECT v_master_id, 'master'::public.app_role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_master_id AND role::text = 'master'
  );

  INSERT INTO public.user_roles (user_id, role, ministry_id)
  SELECT v_ministry_user_id, 'igreja_mae'::public.app_role, v_ministry_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_ministry_user_id AND role::text = 'igreja_mae'
  );

  INSERT INTO public.pending_users (user_id, email, display_name, status, decided_at)
  SELECT v_master_id, v_master_email, 'Master Developer', 'approved', now()
  WHERE NOT EXISTS (SELECT 1 FROM public.pending_users WHERE user_id = v_master_id);

  INSERT INTO public.pending_users (user_id, email, display_name, status, decided_at)
  SELECT v_ministry_user_id, v_ministry_email, 'AD Madureira', 'approved', now()
  WHERE NOT EXISTS (SELECT 1 FROM public.pending_users WHERE user_id = v_ministry_user_id);

  UPDATE public.pending_users
     SET status = 'approved', decided_at = COALESCE(decided_at, now())
   WHERE user_id IN (v_master_id, v_ministry_user_id);
END
$seed_auth$;
