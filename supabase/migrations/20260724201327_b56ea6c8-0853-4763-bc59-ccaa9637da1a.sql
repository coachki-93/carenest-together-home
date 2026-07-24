-- 1) Tighten existing UPDATE policy to add server-side 2h window.
DROP POLICY IF EXISTS "Authors can update their handovers" ON public.handovers;

CREATE POLICY "Authors can update their handovers within window"
  ON public.handovers
  FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    AND private.is_family_member(family_id, auth.uid())
    AND created_at > now() - interval '2 hours'
  )
  WITH CHECK (
    author_id = auth.uid()
    AND private.is_family_member(family_id, auth.uid())
    AND created_at > now() - interval '2 hours'
  );

-- 2) Atomic edit RPC.
CREATE OR REPLACE FUNCTION public.edit_handover(
  _id uuid,
  _shift public.shift_label,
  _shift_start timestamptz,
  _shift_end timestamptz,
  _summary text,
  _sleep text,
  _mood text,
  _seizures text,
  _fluids text,
  _meds text,
  _notes text
)
RETURNS public.handovers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.handovers%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_row FROM public.handovers WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Handover not found'; END IF;
  IF v_row.author_id <> v_uid THEN RAISE EXCEPTION 'Not the author'; END IF;
  IF v_row.created_at <= now() - interval '2 hours' THEN
    RAISE EXCEPTION 'Edit window closed';
  END IF;

  UPDATE public.handovers
    SET shift = _shift,
        shift_start = _shift_start,
        shift_end = _shift_end,
        summary = _summary,
        sleep = _sleep,
        mood = _mood,
        seizures = _seizures,
        fluids = _fluids,
        meds = _meds,
        notes = _notes,
        edited_at = now()
    WHERE id = _id
    RETURNING * INTO v_row;

  DELETE FROM public.handover_reads WHERE handover_id = _id;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_handover(uuid, public.shift_label, timestamptz, timestamptz, text, text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.edit_handover(uuid, public.shift_label, timestamptz, timestamptz, text, text, text, text, text, text, text) TO authenticated;