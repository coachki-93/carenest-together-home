UPDATE public.oxygen_tanks t
SET paused_at = f.at_hospital_since,
    updated_at = now()
FROM public.families f
WHERE t.family_id = f.id
  AND t.replaced_at IS NULL
  AND t.paused_at IS NULL
  AND f.at_hospital_since IS NOT NULL;