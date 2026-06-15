import { createFileRoute } from "@tanstack/react-router";

// Public cron endpoint. Called every minute by pg_cron with the project's
// anon `apikey` header. It finds appointments whose start time has arrived
// (within the last 2 minutes) and whose `notified_at` is still null, then
// fans out a Web Push to every subscription in that family.
//
// Auth model: /api/public/* bypasses Lovable's edge auth. We additionally
// verify the `apikey` header matches the project's anon publishable key so
// random callers can't trigger fan-out.

export const Route = createFileRoute("/api/public/hooks/dispatch-task-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedKey =
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_ANON_KEY ||
          "";
        const apiKey = request.headers.get("apikey") || "";
        if (!expectedKey || apiKey !== expectedKey) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const webpush = (await import("web-push")).default;

        const vapidPublic =
          "BKhqzimlxSXKmf1FK9n0jaINDW5QKsWBwQBD_LZYhpE2GPPdLIDPQAQz2oo4UNQP0riQtptO71Mu2zU5cvoyP38";
        const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
        const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@carenest.app";
        if (!vapidPrivate) {
          return Response.json({ ok: false, error: "Missing VAPID_PRIVATE_KEY" }, { status: 500 });
        }
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

        const now = new Date();
        // Window: anything that should have fired in the last 2 minutes
        // and is still unnotified. 2 min gives slack for cron drift.
        const windowStart = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
        const windowEnd = now.toISOString();

        const { data: appts, error: apptErr } = await supabaseAdmin
          .from("appointments")
          .select("id, family_id, title, kind, starts_at")
          .is("notified_at", null)
          .gte("starts_at", windowStart)
          .lte("starts_at", windowEnd)
          .limit(200);

        if (apptErr) {
          return Response.json({ ok: false, error: apptErr.message }, { status: 500 });
        }
        if (!appts || appts.length === 0) {
          return Response.json({ ok: true, dispatched: 0 });
        }

        let dispatched = 0;
        const staleEndpoints: string[] = [];

        for (const a of appts) {
          const { data: subs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("family_id", a.family_id);

          if (subs && subs.length > 0) {
            const payload = JSON.stringify({
              title: a.title || "CareNest",
              body: formatBody(a.kind, a.starts_at),
              tag: `appt-${a.id}`,
              url: "/dashboard",
            });

            await Promise.allSettled(
              subs.map(async (s) => {
                try {
                  await webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    payload,
                    { TTL: 60 * 60 },
                  );
                  dispatched++;
                } catch (e: unknown) {
                  const status = (e as { statusCode?: number })?.statusCode;
                  if (status === 404 || status === 410) {
                    staleEndpoints.push(s.endpoint);
                  } else {
                    console.error("push send failed", status, e);
                  }
                }
              }),
            );
          }

          await supabaseAdmin
            .from("appointments")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", a.id);
        }

        if (staleEndpoints.length > 0) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .in("endpoint", staleEndpoints);
        }

        return Response.json({
          ok: true,
          considered: appts.length,
          dispatched,
          cleaned: staleEndpoints.length,
        });
      },
    },
  },
});

function formatBody(kind: string | null, startsAt: string): string {
  const t = new Date(startsAt);
  const time = t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return kind ? `${humanKind(kind)} • ${time}` : time;
}

function humanKind(kind: string): string {
  switch (kind) {
    case "temperature": return "Temperature";
    case "heart_rate": return "Heart rate";
    case "spo2": return "Oxygen";
    case "breathing": return "Breathing";
    case "fluids": return "Fluids";
    case "diaper": return "Diaper";
    case "seizure": return "Seizure";
    case "meal": return "Meal";
    case "sleep": return "Sleep";
    case "therapy": return "Therapy";
    case "appointment": return "Appointment";
    case "note": return "Note";
    default: return "Task";
  }
}
