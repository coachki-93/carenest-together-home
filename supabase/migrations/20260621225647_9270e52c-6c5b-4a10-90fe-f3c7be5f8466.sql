
-- 1. Severity enum + columns on checklist items
CREATE TYPE public.care_place_severity AS ENUM ('routine', 'critical');

ALTER TABLE public.care_place_checklist_items
  ADD COLUMN severity public.care_place_severity NOT NULL DEFAULT 'routine',
  ADD COLUMN decrement_amount integer NOT NULL DEFAULT 1 CHECK (decrement_amount >= 1);

-- 2. Grace minutes on check times
ALTER TABLE public.care_place_check_times
  ADD COLUMN grace_minutes integer NOT NULL DEFAULT 30 CHECK (grace_minutes >= 0 AND grace_minutes <= 720);

-- 3. Missed-checks marker table
CREATE TABLE public.care_place_missed_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  time_id uuid NOT NULL REFERENCES public.care_place_check_times(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, time_id, scheduled_date)
);

GRANT SELECT ON public.care_place_missed_checks TO authenticated;
GRANT ALL ON public.care_place_missed_checks TO service_role;

ALTER TABLE public.care_place_missed_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view missed checks"
  ON public.care_place_missed_checks
  FOR SELECT
  TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE INDEX care_place_missed_checks_family_date_idx
  ON public.care_place_missed_checks(family_id, scheduled_date DESC);

-- 4. Ordered tracking on inventory items
ALTER TABLE public.inventory_items
  ADD COLUMN ordered_at timestamptz,
  ADD COLUMN expected_at date,
  ADD COLUMN ordered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. New adjustment reason
ALTER TYPE public.inventory_adjustment_reason ADD VALUE IF NOT EXISTS 'received';
