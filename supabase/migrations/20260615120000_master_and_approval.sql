-- Master role + fluxo de aprovacao de usuarios

-- 1) Novo valor de enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'master';

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

CREATE POLICY "pending self read" ON public.pending_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_master(auth.uid()));

CREATE POLICY "pending master update" ON public.pending_users
  FOR UPDATE TO authenticated
  USING (public.is_master(auth.uid()));

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
