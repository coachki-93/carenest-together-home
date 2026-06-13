-- Vitals & fluid tracking
CREATE TYPE public.vital_type AS ENUM ('heart_rate', 'spo2', 'temperature', 'weight', 'seizure', 'fluids', 'other');

CREATE TABLE public.vitals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    child_id uuid REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    vital_type public.vital_type NOT NULL,
    value numeric NOT NULL,
    unit text NOT NULL,
    notes text,
    logged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    logged_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vitals TO authenticated;
GRANT ALL ON public.vitals TO service_role;

ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view family vitals"
ON public.vitals FOR SELECT TO authenticated
USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Members can insert vitals"
ON public.vitals FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Members can update family vitals"
ON public.vitals FOR UPDATE TO authenticated
USING (public.is_family_member(family_id, auth.uid()))
WITH CHECK (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Members can delete family vitals"
ON public.vitals FOR DELETE TO authenticated
USING (public.is_family_member(family_id, auth.uid()));

CREATE INDEX idx_vitals_family_logged ON public.vitals (family_id, logged_at DESC);
CREATE INDEX idx_vitals_child_type_logged ON public.vitals (child_id, vital_type, logged_at DESC);

CREATE TRIGGER set_vitals_updated_at
BEFORE UPDATE ON public.vitals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();