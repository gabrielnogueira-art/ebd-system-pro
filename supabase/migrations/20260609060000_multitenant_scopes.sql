-- Iteracao 1: Expandir roles e escopos para multi-tenant (Ministerio/Sede/Congregacao)

-- 1) Novos valores no enum app_role
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'igreja_mae';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'igreja_sede';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
