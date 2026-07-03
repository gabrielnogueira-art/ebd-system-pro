ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS teacher_student_id integer REFERENCES public.students(id) ON DELETE SET NULL;