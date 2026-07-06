/**
 * Auth check for `/api/public/hooks/*` cron endpoints.
 *
 * Preferred: caller sends `x-cron-secret: <CRON_SECRET>`.
 * Legacy (one deploy cycle only, remove after pg_cron jobs are rotated):
 *   caller sends `apikey: <SUPABASE_PUBLISHABLE_KEY>`.
 *
 * Returns null when authorized, or a 401 Response otherwise.
 */
export function authorizeCronRequest(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET || "";
  const provided = request.headers.get("x-cron-secret") || "";
  if (cronSecret && provided && provided === cronSecret) return null;

  // Legacy fallback — remove once pg_cron jobs are updated.
  const legacyKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  const apiKey = request.headers.get("apikey") || "";
  if (legacyKey && apiKey && apiKey === legacyKey) return null;

  return new Response("Unauthorized", { status: 401 });
}
