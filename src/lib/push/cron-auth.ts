/**
 * Auth check for `/api/public/hooks/*` cron endpoints.
 *
 * Primary: caller sends `x-cron-secret: <secret>`, where the expected value
 * is stored in `private.app_secrets` (key='cron_secret') and fetched via the
 * `public.get_app_secret` SECURITY DEFINER RPC using the service role. This
 * lets us rotate the secret with a single UPDATE — no redeploy required.
 *
 * Optional override: env `CRON_SECRET`, when set, takes precedence over the DB
 * value (useful for local runs).
 *
 * Legacy fallback (one deploy cycle, remove after pg_cron jobs are verified
 * green on x-cron-secret): caller sends `apikey: <SUPABASE_PUBLISHABLE_KEY>`.
 *
 * Returns null when authorized, or a 401 Response otherwise.
 */

let cached: { value: string; expiresAt: number } | null = null;
const TTL_MS = 60_000;

async function loadDbSecret(): Promise<string | null> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("get_app_secret", {
      _key: "cron_secret",
    });
    if (error || !data) return cached?.value ?? null;
    const value = String(data);
    cached = { value, expiresAt: now + TTL_MS };
    return value;
  } catch {
    return cached?.value ?? null;
  }
}

export async function authorizeCronRequest(request: Request): Promise<Response | null> {
  const provided = request.headers.get("x-cron-secret") || "";

  const envOverride = process.env.CRON_SECRET || "";
  if (envOverride && provided && provided === envOverride) return null;

  if (provided) {
    const dbSecret = await loadDbSecret();
    if (dbSecret && provided === dbSecret) return null;
  }

  // Legacy fallback — remove once pg_cron jobs are verified green.
  const legacyKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  const apiKey = request.headers.get("apikey") || "";
  if (legacyKey && apiKey && apiKey === legacyKey) return null;

  return new Response("Unauthorized", { status: 401 });
}
