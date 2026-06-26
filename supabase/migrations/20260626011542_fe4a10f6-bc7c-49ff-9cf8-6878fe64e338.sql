CREATE INDEX IF NOT EXISTS idx_registrations_class_id ON public.registrations (class_id);
CREATE INDEX IF NOT EXISTS idx_registrations_registration_date ON public.registrations (registration_date);
CREATE INDEX IF NOT EXISTS idx_registrations_class_date ON public.registrations (class_id, registration_date);

CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students (class_id);
CREATE INDEX IF NOT EXISTS idx_students_active_class ON public.students (active, class_id);

CREATE INDEX IF NOT EXISTS idx_classes_congregation_id ON public.classes (congregation_id);
CREATE INDEX IF NOT EXISTS idx_congregations_headquarters_id ON public.congregations (headquarters_id);
CREATE INDEX IF NOT EXISTS idx_congregations_regional_id ON public.congregations (regional_id);
CREATE INDEX IF NOT EXISTS idx_regionals_headquarters_id ON public.regionals (headquarters_id);
CREATE INDEX IF NOT EXISTS idx_headquarters_ministry_id ON public.headquarters (ministry_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_ministry_id ON public.user_roles (ministry_id) WHERE ministry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_headquarters_id ON public.user_roles (headquarters_id) WHERE headquarters_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_regional_id ON public.user_roles (regional_id) WHERE regional_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_congregation_id ON public.user_roles (congregation_id) WHERE congregation_id IS NOT NULL;