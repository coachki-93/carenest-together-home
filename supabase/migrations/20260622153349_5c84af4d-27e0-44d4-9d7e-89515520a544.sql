
ALTER TABLE public.oxygen_tanks
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_seconds bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.set_family_hospital_mode(_family_id uuid, _on boolean)
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
          updated_at = now()
      WHERE id = _family_id
      RETURNING at_hospital_since INTO v_ts;

    -- Pause the active oxygen tank, if any and not already paused
    UPDATE public.oxygen_tanks
      SET paused_at = now(),
          updated_at = now()
      WHERE family_id = _family_id
        AND replaced_at IS NULL
        AND paused_at IS NULL;
  ELSE
    UPDATE public.families
      SET at_hospital_since = NULL,
          updated_at = now()
      WHERE id = _family_id
      RETURNING at_hospital_since INTO v_ts;

    -- Resume active paused tank: accumulate paused time and clear paused_at
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
