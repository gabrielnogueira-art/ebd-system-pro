-- Iteracao 1: Expandir roles e escopos para multi-tenant (Ministerio/Sede/Congregacao)

-- 1) Novos valores no enum app_role (idempotente)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'igreja_mae';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'igreja_sede';

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
