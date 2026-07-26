-- 1) Enum
CREATE TYPE public.care_event_type AS ENUM (
  'seizure',
  'desaturation',
  'vomiting',
  'feed_issue',
  'breathing_difficulty',
  'behavioural',
  'injury',
  'other'
);

-- 2) Table
CREATE TABLE public.care_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id            uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id             uuid REFERENCES public.children(id) ON DELETE SET NULL,
  caregiver_profile_id uuid REFERENCES public.caregiver_profiles(id) ON DELETE SET NULL,
  created_by           uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at          timestamptz NOT NULL,
  type                 public.care_event_type NOT NULL,
  description          text NOT NULL CHECK (length(btrim(description)) > 0),
  action_taken         text,
  severity             smallint CHECK (severity BETWEEN 1 AND 3),
  duration_seconds     integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  active               boolean NOT NULL DEFAULT true,
  edited_at            timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX care_events_family_occurred_idx
  ON public.care_events (family_id, occurred_at DESC);
CREATE INDEX care_events_family_active_occurred_idx
  ON public.care_events (family_id, active, occurred_at DESC);

-- 3) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_events TO authenticated;
GRANT ALL ON public.care_events TO service_role;

-- 4) RLS
ALTER TABLE public.care_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_events_select_family"
  ON public.care_events FOR SELECT TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "care_events_insert_family"
  ON public.care_events FOR INSERT TO authenticated
  WITH CHECK (
    public.is_family_member(family_id, auth.uid())
    AND created_by = auth.uid()
    AND public.caregiver_profile_in_family(caregiver_profile_id, family_id)
  );

-- No UPDATE policy: all edits go through edit_care_event / set_care_event_active RPCs.

CREATE POLICY "care_events_delete_author_or_owner"
  ON public.care_events FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_family_owner(family_id, auth.uid())
  );

-- 5) updated_at trigger
CREATE TRIGGER care_events_set_updated_at
  BEFORE UPDATE ON public.care_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) Edit RPC (mirrors edit_handover: author + 2h window, re-checked server-side, FOR UPDATE)
CREATE OR REPLACE FUNCTION public.edit_care_event(
  _id uuid,
  _occurred_at timestamptz,
  _type public.care_event_type,
  _description text,
  _action_taken text,
  _severity smallint,
  _duration_seconds integer,
  _caregiver_profile_id uuid
) RETURNS public.care_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.care_events%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_row FROM public.care_events WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF v_row.created_by <> v_uid THEN RAISE EXCEPTION 'Not the author'; END IF;
  IF v_row.created_at <= now() - interval '2 hours' THEN
    RAISE EXCEPTION 'Edit window closed';
  END IF;

  IF _description IS NULL OR length(btrim(_description)) = 0 THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  IF NOT public.caregiver_profile_in_family(_caregiver_profile_id, v_row.family_id) THEN
    RAISE EXCEPTION 'Caregiver profile does not belong to this family';
  END IF;

  UPDATE public.care_events
     SET occurred_at          = _occurred_at,
         type                 = _type,
         description          = _description,
         action_taken         = NULLIF(btrim(_action_taken), ''),
         severity             = _severity,
         duration_seconds     = _duration_seconds,
         caregiver_profile_id = _caregiver_profile_id,
         edited_at            = now()
   WHERE id = _id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_care_event(uuid, timestamptz, public.care_event_type, text, text, smallint, integer, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.edit_care_event(uuid, timestamptz, public.care_event_type, text, text, smallint, integer, uuid) TO authenticated;

-- 7) Archive/unarchive RPC — author OR family owner
CREATE OR REPLACE FUNCTION public.set_care_event_active(_id uuid, _active boolean)
RETURNS public.care_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.care_events%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_row FROM public.care_events WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;

  IF v_row.created_by <> v_uid
     AND NOT public.is_family_owner(v_row.family_id, v_uid) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.care_events
     SET active = _active
   WHERE id = _id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.set_care_event_active(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_care_event_active(uuid, boolean) TO authenticated;