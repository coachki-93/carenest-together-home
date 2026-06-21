
-- Enum for checklist item type
DO $$ BEGIN
  CREATE TYPE public.care_place_item_type AS ENUM ('yesno', 'count');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Checklist items
CREATE TABLE public.care_place_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  item_type public.care_place_item_type NOT NULL DEFAULT 'yesno',
  min_count INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_place_checklist_items TO authenticated;
GRANT ALL ON public.care_place_checklist_items TO service_role;
ALTER TABLE public.care_place_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view checklist items"
  ON public.care_place_checklist_items FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Owners can insert checklist items"
  ON public.care_place_checklist_items FOR INSERT TO authenticated
  WITH CHECK (public.is_family_owner(family_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Owners can update checklist items"
  ON public.care_place_checklist_items FOR UPDATE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Owners can delete checklist items"
  ON public.care_place_checklist_items FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()));

CREATE TRIGGER care_place_checklist_items_set_updated_at
  BEFORE UPDATE ON public.care_place_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX care_place_checklist_items_family_id_idx ON public.care_place_checklist_items(family_id);

-- Check times
CREATE TABLE public.care_place_check_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  time_of_day TIME NOT NULL,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_place_check_times TO authenticated;
GRANT ALL ON public.care_place_check_times TO service_role;
ALTER TABLE public.care_place_check_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view check times"
  ON public.care_place_check_times FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Owners can insert check times"
  ON public.care_place_check_times FOR INSERT TO authenticated
  WITH CHECK (public.is_family_owner(family_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Owners can update check times"
  ON public.care_place_check_times FOR UPDATE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Owners can delete check times"
  ON public.care_place_check_times FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()));

CREATE TRIGGER care_place_check_times_set_updated_at
  BEFORE UPDATE ON public.care_place_check_times
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX care_place_check_times_family_id_idx ON public.care_place_check_times(family_id);

-- Completed checks
CREATE TABLE public.care_place_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_place_checks TO authenticated;
GRANT ALL ON public.care_place_checks TO service_role;
ALTER TABLE public.care_place_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view checks"
  ON public.care_place_checks FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Family members can insert checks"
  ON public.care_place_checks FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()) AND performed_by = auth.uid());
CREATE POLICY "Owners can delete checks"
  ON public.care_place_checks FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()));

CREATE INDEX care_place_checks_family_date_idx ON public.care_place_checks(family_id, scheduled_date);

-- Answers
CREATE TABLE public.care_place_check_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_id UUID NOT NULL REFERENCES public.care_place_checks(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.care_place_checklist_items(id) ON DELETE SET NULL,
  item_label_snapshot TEXT NOT NULL,
  item_type_snapshot public.care_place_item_type NOT NULL,
  yesno_value BOOLEAN,
  count_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_place_check_answers TO authenticated;
GRANT ALL ON public.care_place_check_answers TO service_role;
ALTER TABLE public.care_place_check_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view answers"
  ON public.care_place_check_answers FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Family members can insert answers"
  ON public.care_place_check_answers FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Owners can delete answers"
  ON public.care_place_check_answers FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id, auth.uid()));

CREATE INDEX care_place_check_answers_check_idx ON public.care_place_check_answers(check_id);
