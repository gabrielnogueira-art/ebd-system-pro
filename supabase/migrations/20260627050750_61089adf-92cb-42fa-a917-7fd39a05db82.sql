CREATE OR REPLACE FUNCTION public.get_admin_dashboard_trends(
  _class_ids integer[] DEFAULT NULL,
  _start_date timestamptz DEFAULT NULL,
  _end_date timestamptz DEFAULT NULL,
  _selected_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_class_ids integer[];
  v_quarterly jsonb := '[]'::jsonb;
  v_attendance jsonb := '[]'::jsonb;
  v_classes jsonb := '[]'::jsonb;
  v_dates jsonb := '[]'::jsonb;
  v_total_enrolled integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF _class_ids IS NULL THEN
    SELECT COALESCE(array_agg(c.id), ARRAY[]::integer[])
    INTO v_class_ids
    FROM public.classes c
    WHERE c.congregation_id IS NOT NULL;
  ELSE
    IF EXISTS (
      SELECT 1
      FROM unnest(_class_ids) AS requested(class_id)
      LEFT JOIN public.classes c ON c.id = requested.class_id
      WHERE c.id IS NULL OR c.congregation_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Classe inválida';
    END IF;
    v_class_ids := COALESCE(_class_ids, ARRAY[]::integer[]);
  END IF;

  IF COALESCE(array_length(v_class_ids, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'quarterlyData', '[]'::jsonb,
      'attendanceData', jsonb_build_array(jsonb_build_object('dayOfWeek', 'Sem dados', 'attendance', 0)),
      'classData', '[]'::jsonb,
      'availableDates', '[]'::jsonb
    );
  END IF;

  SELECT COUNT(*)
  INTO v_total_enrolled
  FROM public.students s
  WHERE s.active = true
    AND s.class_id = ANY(v_class_ids);

  WITH regs AS (
    SELECT
      r.*,
      (r.registration_date AT TIME ZONE 'America/Sao_Paulo')::date AS local_date
    FROM public.registrations r
    WHERE r.class_id = ANY(v_class_ids)
      AND (_start_date IS NULL OR r.registration_date >= _start_date)
      AND (_end_date IS NULL OR r.registration_date <= _end_date)
  ), daily AS (
    SELECT
      local_date,
      to_char(local_date, 'DD/MM') AS day,
      COUNT(*)::int AS registrations,
      COALESCE(SUM(total_present), 0)::numeric + COALESCE(SUM(visitors), 0)::numeric AS presence,
      COALESCE(SUM(offering_cash), 0)::numeric + COALESCE(SUM(offering_pix), 0)::numeric AS offerings
    FROM regs
    GROUP BY local_date
    ORDER BY local_date
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'day', day,
    'month', to_char(local_date, 'Mon'),
    'registrations', registrations,
    'presence', presence,
    'offerings', offerings
  ) ORDER BY local_date), '[]'::jsonb)
  INTO v_quarterly
  FROM daily;

  WITH regs AS (
    SELECT
      (r.registration_date AT TIME ZONE 'America/Sao_Paulo')::date AS local_date,
      COALESCE(r.total_present, 0)::numeric AS total_present
    FROM public.registrations r
    WHERE r.class_id = ANY(v_class_ids)
      AND (_start_date IS NULL OR r.registration_date >= _start_date)
      AND (_end_date IS NULL OR r.registration_date <= _end_date)
  ), per_day AS (
    SELECT local_date, SUM(total_present) AS present
    FROM regs
    GROUP BY local_date
    ORDER BY local_date
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'dayOfWeek', to_char(local_date, 'DD/MM'),
    'attendance', CASE WHEN v_total_enrolled > 0 THEN ROUND((present / v_total_enrolled) * 100)::int ELSE 0 END
  ) ORDER BY local_date), jsonb_build_array(jsonb_build_object('dayOfWeek', 'Sem dados', 'attendance', 0)))
  INTO v_attendance
  FROM per_day;

  WITH regs AS (
    SELECT r.*
    FROM public.registrations r
    WHERE r.class_id = ANY(v_class_ids)
      AND (_start_date IS NULL OR r.registration_date >= _start_date)
      AND (_end_date IS NULL OR r.registration_date <= _end_date)
      AND (_selected_date IS NULL OR (r.registration_date AT TIME ZONE 'America/Sao_Paulo')::date = _selected_date)
  ), class_stats AS (
    SELECT
      r.class_id,
      COALESCE(SUM(r.total_present), 0)::numeric AS present,
      COALESCE(SUM(r.bibles), 0)::numeric AS bibles,
      COALESCE(SUM(r.magazines), 0)::numeric AS magazines,
      COUNT(*)::numeric AS reg_count
    FROM regs r
    GROUP BY r.class_id
  ), enrolled AS (
    SELECT s.class_id, COUNT(*)::numeric AS enrolled
    FROM public.students s
    WHERE s.active = true
      AND s.class_id = ANY(v_class_ids)
    GROUP BY s.class_id
  ), rows AS (
    SELECT
      c.id,
      trim(split_part(c.name, '(', 1)) AS class_name,
      COALESCE(e.enrolled, 0) AS enrolled,
      COALESCE(cs.present, 0) AS total_present,
      COALESCE(cs.bibles, 0) AS total_bibles,
      COALESCE(cs.magazines, 0) AS total_magazines,
      GREATEST(COALESCE(cs.reg_count, 0), 1) AS reg_count
    FROM public.classes c
    LEFT JOIN class_stats cs ON cs.class_id = c.id
    LEFT JOIN enrolled e ON e.class_id = c.id
    WHERE c.id = ANY(v_class_ids)
      AND upper(c.name) NOT LIKE '%PROFESSOR%'
      AND upper(c.name) NOT LIKE '%EXTRA%'
  ), final_rows AS (
    SELECT
      id,
      class_name,
      enrolled,
      CASE WHEN _selected_date IS NULL THEN ROUND(total_present / reg_count) ELSE total_present END AS present,
      total_bibles,
      total_magazines,
      total_present
    FROM rows
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'className', class_name,
    'enrolled', enrolled,
    'present', present,
    'percentage', CASE WHEN enrolled > 0 THEN ROUND((present / enrolled) * 100, 1) ELSE 0 END,
    'presenceRate', CASE WHEN enrolled > 0 THEN ROUND((present / enrolled) * 100, 1) ELSE 0 END,
    'biblesRate', CASE WHEN total_present > 0 THEN ROUND((total_bibles / total_present) * 100, 1) ELSE 0 END,
    'magazinesRate', CASE WHEN total_present > 0 THEN ROUND((total_magazines / total_present) * 100, 1) ELSE 0 END,
    'totalBibles', total_bibles,
    'totalMagazines', total_magazines,
    'totalPresent', total_present
  ) ORDER BY id), '[]'::jsonb)
  INTO v_classes
  FROM final_rows;

  SELECT COALESCE(jsonb_agg(to_char(local_date, 'YYYY-MM-DD') ORDER BY local_date), '[]'::jsonb)
  INTO v_dates
  FROM (
    SELECT DISTINCT (r.registration_date AT TIME ZONE 'America/Sao_Paulo')::date AS local_date
    FROM public.registrations r
    WHERE r.class_id = ANY(v_class_ids)
      AND (_start_date IS NULL OR r.registration_date >= _start_date)
      AND (_end_date IS NULL OR r.registration_date <= _end_date)
  ) d;

  RETURN jsonb_build_object(
    'quarterlyData', v_quarterly,
    'attendanceData', CASE WHEN jsonb_array_length(v_attendance) > 0 THEN v_attendance ELSE jsonb_build_array(jsonb_build_object('dayOfWeek', 'Sem dados', 'attendance', 0)) END,
    'classData', v_classes,
    'availableDates', v_dates
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_trends(integer[], timestamptz, timestamptz, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_trends(integer[], timestamptz, timestamptz, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_trends(integer[], timestamptz, timestamptz, date) TO service_role;