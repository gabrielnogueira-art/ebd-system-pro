
-- Add missing columns expected by the frontend
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS class_notes TEXT,
  ADD COLUMN IF NOT EXISTS ebd_notes TEXT;

-- Settings table used by Admin/EBD form to gate registrations
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings public read" ON public.system_settings;
CREATE POLICY "system_settings public read"
  ON public.system_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "system_settings master write" ON public.system_settings;
CREATE POLICY "system_settings master write"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

INSERT INTO public.system_settings (key, value, description)
VALUES ('allow_registrations', 'true'::jsonb, 'Controla se o formulário de registro está aberto')
ON CONFLICT (key) DO NOTHING;
