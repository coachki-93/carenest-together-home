
-- 1. Private schema + secrets table
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON private.app_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.app_secrets TO service_role;
ALTER TABLE private.app_secrets ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) can access.

-- Seed a random cron secret if not already set
INSERT INTO private.app_secrets (key, value)
VALUES ('cron_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- 2. Helper for server code (service_role only) to fetch a secret via PostgREST RPC.
CREATE OR REPLACE FUNCTION public.get_app_secret(_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT value FROM private.app_secrets WHERE key = _key;
$$;

REVOKE ALL ON FUNCTION public.get_app_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_secret(text) TO service_role;

-- 3. Reschedule cron jobs to read secret at call time
SELECT cron.unschedule('dispatch-task-notifications');
SELECT cron.unschedule('care-place-missed-sweep');
SELECT cron.unschedule('oxygen-low-sweep-15min');

SELECT cron.schedule(
  'dispatch-task-notifications',
  '* * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://project--60a22743-1112-47ca-8a79-aa0a0e0380ad.lovable.app/api/public/hooks/dispatch-task-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM private.app_secrets WHERE key = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $job$
);

SELECT cron.schedule(
  'care-place-missed-sweep',
  '*/5 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://project--60a22743-1112-47ca-8a79-aa0a0e0380ad.lovable.app/api/public/hooks/care-place-missed-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM private.app_secrets WHERE key = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $job$
);

SELECT cron.schedule(
  'oxygen-low-sweep-15min',
  '*/15 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://project--60a22743-1112-47ca-8a79-aa0a0e0380ad.lovable.app/api/public/hooks/oxygen-low-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM private.app_secrets WHERE key = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $job$
);
