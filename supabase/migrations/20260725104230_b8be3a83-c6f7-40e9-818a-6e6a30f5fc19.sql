ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS hospital_paused jsonb;

COMMENT ON COLUMN public.families.hospital_paused IS
  'Which categories are paused while at_hospital_since is set. Keys: oxygen, care_place, tasks, handover (all boolean). NULL or empty = legacy default (oxygen + care_place paused).';

CREATE OR REPLACE FUNCTION public.set_family_hospital_mode(
  _family_id uuid,
  _on boolean,
  _paused jsonb DEFAULT NULL
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_ts timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_family_member(_family_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a family member';
  END IF;
  IF _on THEN
    UPDATE public.families
      SET at_hospital_since = COALESCE(at_hospital_since, now()),
          hospital_paused = COALESCE(_paused, hospital_paused),
          updated_at = now()
      WHERE id = _family_id
      RETURNING at_hospital_since INTO v_ts;

    -- Pause the active oxygen tank only if the "oxygen" category is paused.
    -- Legacy default (hospital_paused null/empty) includes oxygen.
    UPDATE public.oxygen_tanks
      SET paused_at = now(),
          updated_at = now()
      WHERE family_id = _family_id
        AND replaced_at IS NULL
        AND paused_at IS NULL
        AND (
          SELECT COALESCE((f.hospital_paused ->> 'oxygen')::boolean, true)
          FROM public.families f WHERE f.id = _family_id
        );
  ELSE
    UPDATE public.families
      SET at_hospital_since = NULL,
          updated_at = now()
      WHERE id = _family_id
      RETURNING at_hospital_since INTO v_ts;

    -- Resume any paused tank in this family.
    UPDATE public.oxygen_tanks
      SET paused_seconds = paused_seconds + GREATEST(0, EXTRACT(EPOCH FROM (now() - paused_at))::bigint),
          paused_at = NULL,
          updated_at = now()
      WHERE family_id = _family_id
        AND replaced_at IS NULL
        AND paused_at IS NOT NULL;
  END IF;
  RETURN v_ts;
END;
$function$;