CREATE OR REPLACE FUNCTION public.validate_class_teacher_student()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_teacher_congregation uuid;
BEGIN
  IF NEW.teacher_student_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT teacher_class.congregation_id
  INTO v_teacher_congregation
  FROM public.students s
  JOIN public.classes teacher_class ON teacher_class.id = s.class_id
  WHERE s.id = NEW.teacher_student_id
    AND s.active = true;

  IF v_teacher_congregation IS NULL OR v_teacher_congregation IS DISTINCT FROM NEW.congregation_id THEN
    RAISE EXCEPTION 'O professor responsável deve ser um aluno ativo da mesma congregação da classe';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_class_teacher_student_trigger ON public.classes;
CREATE TRIGGER validate_class_teacher_student_trigger
BEFORE INSERT OR UPDATE OF teacher_student_id, congregation_id
ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.validate_class_teacher_student();