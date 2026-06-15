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
