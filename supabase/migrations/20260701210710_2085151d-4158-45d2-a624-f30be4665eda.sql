
-- 1. tidy_settings
CREATE TABLE public.tidy_settings (
  family_id uuid PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  lead_minutes integer NOT NULL DEFAULT 30 CHECK (lead_minutes IN (15,30,45,60)),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tidy_settings TO authenticated;
GRANT ALL ON public.tidy_settings TO service_role;
ALTER TABLE public.tidy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view tidy settings" ON public.tidy_settings
  FOR SELECT USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Owners insert tidy settings" ON public.tidy_settings
  FOR INSERT WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Owners update tidy settings" ON public.tidy_settings
  FOR UPDATE USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Owners delete tidy settings" ON public.tidy_settings
  FOR DELETE USING (public.is_family_owner(family_id, auth.uid()));

CREATE TRIGGER tidy_settings_updated_at BEFORE UPDATE ON public.tidy_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. tidy_checklist_items
CREATE TABLE public.tidy_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tidy_checklist_items_family_idx ON public.tidy_checklist_items(family_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tidy_checklist_items TO authenticated;
GRANT ALL ON public.tidy_checklist_items TO service_role;
ALTER TABLE public.tidy_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view tidy items" ON public.tidy_checklist_items
  FOR SELECT USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Owners insert tidy items" ON public.tidy_checklist_items
  FOR INSERT WITH CHECK (public.is_family_owner(family_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Owners update tidy items" ON public.tidy_checklist_items
  FOR UPDATE USING (public.is_family_owner(family_id, auth.uid()))
  WITH CHECK (public.is_family_owner(family_id, auth.uid()));
CREATE POLICY "Owners delete tidy items" ON public.tidy_checklist_items
  FOR DELETE USING (public.is_family_owner(family_id, auth.uid()));

CREATE TRIGGER tidy_items_updated_at BEFORE UPDATE ON public.tidy_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. tidy_submissions
CREATE TABLE public.tidy_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  shift_master_id uuid REFERENCES public.caregiver_shifts(id) ON DELETE SET NULL,
  shift_occurrence_start timestamptz,
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tidy_submissions_family_idx ON public.tidy_submissions(family_id, submitted_at DESC);
CREATE INDEX tidy_submissions_shift_idx ON public.tidy_submissions(shift_master_id, shift_occurrence_start);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tidy_submissions TO authenticated;
GRANT ALL ON public.tidy_submissions TO service_role;
ALTER TABLE public.tidy_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view tidy submissions" ON public.tidy_submissions
  FOR SELECT USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Members insert tidy submissions" ON public.tidy_submissions
  FOR INSERT WITH CHECK (public.is_family_member(family_id, auth.uid()) AND performed_by = auth.uid());
CREATE POLICY "Owners delete tidy submissions" ON public.tidy_submissions
  FOR DELETE USING (public.is_family_owner(family_id, auth.uid()));

-- 4. tidy_submission_answers
CREATE TABLE public.tidy_submission_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.tidy_submissions(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.tidy_checklist_items(id) ON DELETE SET NULL,
  item_label_snapshot text NOT NULL,
  status text NOT NULL CHECK (status IN ('done','skipped')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tidy_answers_submission_idx ON public.tidy_submission_answers(submission_id);
CREATE INDEX tidy_answers_family_idx ON public.tidy_submission_answers(family_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tidy_submission_answers TO authenticated;
GRANT ALL ON public.tidy_submission_answers TO service_role;
ALTER TABLE public.tidy_submission_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view tidy answers" ON public.tidy_submission_answers
  FOR SELECT USING (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Members insert tidy answers" ON public.tidy_submission_answers
  FOR INSERT WITH CHECK (public.is_family_member(family_id, auth.uid()));
CREATE POLICY "Owners delete tidy answers" ON public.tidy_submission_answers
  FOR DELETE USING (public.is_family_owner(family_id, auth.uid()));
