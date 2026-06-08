-- Permitir que usuarios autenticados gerenciem a hierarquia
CREATE POLICY "auth manage ministries"
  ON public.ministries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth manage headquarters"
  ON public.headquarters FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth manage regionals"
  ON public.regionals FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth manage congregations"
  ON public.congregations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
