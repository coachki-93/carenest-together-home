/**
 * Auth check for `/api/public/hooks/*` cron endpoints.
 *
 * Caller must send `x-cron-secret: <secret>`. The expected value is stored in
 * `private.app_secrets` (key='cron_secret') and fetched via the
 * `public.get_app_secret` SECURITY DEFINER RPC using the service role, cached
 * in module scope for 60s. Rotation is a one-line UPDATE on the table — no
 * redeploy required.
 *
 * Optional override: env `CRON_SECRET`, when set and matched, is accepted too
 * (useful for local runs / emergency access).
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
  if (!provided) return new Response("Unauthorized", { status: 401 });

  const envOverride = process.env.CRON_SECRET || "";
  if (envOverride && provided === envOverride) return null;

  const dbSecret = await loadDbSecret();
  if (dbSecret && provided === dbSecret) return null;

  return new Response("Unauthorized", { status: 401 });
}
