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

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_master_id, v_master_id, jsonb_build_object('sub', v_master_id::text, 'email', v_master_email), 'email', v_master_id::text, now(), now(), now())
  ON CONFLICT (provider, provider_id) DO UPDATE
    SET user_id = EXCLUDED.user_id, identity_data = EXCLUDED.identity_data, updated_at = now();

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

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_ministry_user_id, v_ministry_user_id, jsonb_build_object('sub', v_ministry_user_id::text, 'email', v_ministry_email), 'email', v_ministry_user_id::text, now(), now(), now())
  ON CONFLICT (provider, provider_id) DO UPDATE
    SET user_id = EXCLUDED.user_id, identity_data = EXCLUDED.identity_data, updated_at = now();

  INSERT INTO public.ministries (id, name, city)
  VALUES (v_ministry_id, 'Assembleia de Deus Ministério Madureira', 'Rio de Janeiro')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_master_id, 'master')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role, ministry_id)
  VALUES (v_ministry_user_id, 'igreja_mae', v_ministry_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pending_users (user_id, email, display_name, status, decided_at)
  VALUES
    (v_master_id, v_master_email, 'Master Developer', 'approved', now()),
    (v_ministry_user_id, v_ministry_email, 'AD Madureira', 'approved', now())
  ON CONFLICT DO NOTHING;

  UPDATE public.pending_users
     SET status = 'approved', decided_at = COALESCE(decided_at, now())
   WHERE user_id IN (v_master_id, v_ministry_user_id);
END
$seed_auth$;
