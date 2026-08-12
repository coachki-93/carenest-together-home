CREATE OR REPLACE FUNCTION public.family_last_active(_family_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    (SELECT max(last_seen_at) FROM public.push_subscriptions WHERE family_id = _family_id),
    (SELECT max(logged_at)    FROM public.vitals            WHERE family_id = _family_id),
    (SELECT max(occurred_at)  FROM public.care_events       WHERE family_id = _family_id),
    (SELECT max(created_at)   FROM public.handovers         WHERE family_id = _family_id)
  );
$$;

REVOKE ALL ON FUNCTION public.family_last_active(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.family_last_active(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.family_last_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.family_last_active(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.family_notification_attempts(_family_id uuid, _limit int DEFAULT 20)
RETURNS TABLE(occurrence_at timestamptz, pass text, notified_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.occurrence_at, n.pass, n.notified_at
  FROM public.appointment_notifications n
  JOIN public.appointments a ON a.id = n.appointment_id
  WHERE a.family_id = _family_id
  ORDER BY n.notified_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION public.family_notification_attempts(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.family_notification_attempts(uuid, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.family_notification_attempts(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.family_notification_attempts(uuid, int) TO service_role;