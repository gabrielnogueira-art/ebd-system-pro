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

CREATE POLICY "read ministries" ON public.ministries FOR SELECT USING (true);
CREATE POLICY "read headquarters" ON public.headquarters FOR SELECT USING (true);
CREATE POLICY "read regionals" ON public.regionals FOR SELECT USING (true);
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
