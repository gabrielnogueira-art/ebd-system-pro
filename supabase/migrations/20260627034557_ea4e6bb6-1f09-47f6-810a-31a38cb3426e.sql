CREATE INDEX IF NOT EXISTS idx_registrations_class_id ON public.registrations(class_id);
CREATE INDEX IF NOT EXISTS idx_registrations_class_date ON public.registrations(class_id, registration_date);
CREATE INDEX IF NOT EXISTS idx_registrations_date ON public.registrations(registration_date);
CREATE INDEX IF NOT EXISTS idx_students_active_class ON public.students(active, class_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_congregation_id ON public.classes(congregation_id);
CREATE INDEX IF NOT EXISTS idx_congregations_headquarters_id ON public.congregations(headquarters_id);
CREATE INDEX IF NOT EXISTS idx_congregations_regional_id ON public.congregations(regional_id);
CREATE INDEX IF NOT EXISTS idx_regionals_headquarters_id ON public.regionals(headquarters_id);
CREATE INDEX IF NOT EXISTS idx_headquarters_ministry_id ON public.headquarters(ministry_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_user_roles_scope ON public.user_roles(user_id, ministry_id, headquarters_id, regional_id, congregation_id);

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary(
  _class_ids integer[] DEFAULT NULL,
  _today date DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date)
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_master boolean := false;
  v_class_ids integer[];
  v_total_classes integer := 0;
  v_total_students integer := 0;
  v_total_registrations integer := 0;
  v_today_registrations integer := 0;
  v_total_presence numeric := 0;
  v_total_visitors numeric := 0;
  v_total_offerings numeric := 0;
  v_unique_dates integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  v_is_master := public.is_master(v_uid);

  IF _class_ids IS NULL THEN
    IF v_is_master THEN
      SELECT COALESCE(array_agg(c.id), ARRAY[]::integer[])
      INTO v_class_ids
      FROM public.classes c
      WHERE c.congregation_id IS NOT NULL;
    ELSE
      SELECT COALESCE(array_agg(c.id), ARRAY[]::integer[])
      INTO v_class_ids
      FROM public.classes c
      WHERE c.congregation_id IS NOT NULL
        AND public.user_can_see_congregation(v_uid, c.congregation_id);
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1
      FROM unnest(_class_ids) AS requested(class_id)
      LEFT JOIN public.classes c ON c.id = requested.class_id
      WHERE c.id IS NULL
        OR c.congregation_id IS NULL
        OR (NOT v_is_master AND NOT public.user_can_see_congregation(v_uid, c.congregation_id))
    ) THEN
      RAISE EXCEPTION 'Sem permissão para consultar uma ou mais classes';
    END IF;
    v_class_ids := COALESCE(_class_ids, ARRAY[]::integer[]);
  END IF;

  IF COALESCE(array_length(v_class_ids, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'totalRegistrations', 0,
      'totalStudents', 0,
      'totalClasses', 0,
      'todayRegistrations', 0,
      'totalPresence', 0,
      'totalVisitors', 0,
      'totalOfferings', 0
    );
  END IF;

  SELECT COUNT(*) INTO v_total_classes
  FROM public.classes c
  WHERE c.id = ANY(v_class_ids);

  SELECT COUNT(*) INTO v_total_students
  FROM public.students s
  WHERE s.active = true
    AND s.class_id = ANY(v_class_ids);

  SELECT
    COUNT(*),
    COALESCE(SUM(r.total_present), 0),
    COALESCE(SUM(r.visitors), 0),
    COALESCE(SUM(r.offering_cash), 0) + COALESCE(SUM(r.offering_pix), 0),
    COUNT(DISTINCT (r.registration_date AT TIME ZONE 'America/Sao_Paulo')::date)
  INTO
    v_total_registrations,
    v_total_presence,
    v_total_visitors,
    v_total_offerings,
    v_unique_dates
  FROM public.registrations r
  WHERE r.class_id = ANY(v_class_ids);

  SELECT COUNT(*) INTO v_today_registrations
  FROM public.registrations r
  WHERE r.class_id = ANY(v_class_ids)
    AND (r.registration_date AT TIME ZONE 'America/Sao_Paulo')::date = _today;

  RETURN jsonb_build_object(
    'totalRegistrations', v_total_registrations,
    'totalStudents', v_total_students,
    'totalClasses', v_total_classes,
    'todayRegistrations', v_today_registrations,
    'totalPresence', CASE WHEN v_unique_dates > 0 THEN ROUND(v_total_presence / v_unique_dates) ELSE 0 END,
    'totalVisitors', CASE WHEN v_unique_dates > 0 THEN ROUND(v_total_visitors / v_unique_dates) ELSE 0 END,
    'totalOfferings', v_total_offerings
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_summary(integer[], date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary(integer[], date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary(integer[], date) TO service_role;