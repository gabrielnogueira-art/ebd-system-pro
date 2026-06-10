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
