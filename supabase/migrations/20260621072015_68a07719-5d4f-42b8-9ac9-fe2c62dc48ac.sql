CREATE TABLE public.care_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_instructions TO authenticated;
GRANT ALL ON public.care_instructions TO service_role;

ALTER TABLE public.care_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view instructions"
  ON public.care_instructions FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can insert instructions"
  ON public.care_instructions FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Family members can update instructions"
  ON public.care_instructions FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id, auth.uid()))
  WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family members can delete instructions"
  ON public.care_instructions FOR DELETE TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE TRIGGER care_instructions_set_updated_at
  BEFORE UPDATE ON public.care_instructions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX care_instructions_family_id_idx ON public.care_instructions(family_id);