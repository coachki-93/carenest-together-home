ALTER TABLE public.medications
  DROP CONSTRAINT IF EXISTS medications_course_range_chk;

ALTER TABLE public.medications
  DROP COLUMN IF EXISTS starts_on,
  DROP COLUMN IF EXISTS ends_on,
  ADD COLUMN course_first_dose_at timestamptz,
  ADD COLUMN course_total_doses   integer;

ALTER TABLE public.medications
  ADD CONSTRAINT medications_course_shape_chk CHECK (
    (course_first_dose_at IS NULL AND course_total_doses IS NULL)
    OR (course_first_dose_at IS NOT NULL AND course_total_doses IS NOT NULL AND course_total_doses > 0)
  );