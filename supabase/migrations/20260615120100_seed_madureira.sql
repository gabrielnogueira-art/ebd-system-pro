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

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_existing, v_existing,
      jsonb_build_object('sub', v_existing::text, 'email', v_email),
      'email', v_existing::text, now(), now(), now()
    ) ON CONFLICT (provider, provider_id) DO UPDATE
      SET user_id = EXCLUDED.user_id, identity_data = EXCLUDED.identity_data, updated_at = now();
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
