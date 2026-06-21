import { createFileRoute } from "@tanstack/react-router";

/**
 * Sweeps for Care Place Control slots whose grace window has expired today
 * with no completed check, writes a marker row in `care_place_missed_checks`,
 * and dispatches one push per family. Idempotent via UNIQUE
 * (family_id, time_id, scheduled_date).
 *
 * Triggered every ~5 minutes by pg_cron with the project's `apikey` header.
 */
export const Route = createFileRoute("/api/public/hooks/care-place-missed-sweep")({
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
        if (vapidPrivate) {
          webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
        }

        const CARE_PLACE_WINDOW_MIN = 30;
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const nowMin = now.getHours() * 60 + now.getMinutes();

        const { data: times, error: tErr } = await supabaseAdmin
          .from("care_place_check_times")
          .select("id, family_id, time_of_day, grace_minutes, label")
          .eq("active", true);
        if (tErr) return Response.json({ ok: false, error: tErr.message }, { status: 500 });
        if (!times?.length) return Response.json({ ok: true, missed: 0 });

        const { data: todaysChecks } = await supabaseAdmin
          .from("care_place_checks")
          .select("family_id, scheduled_time")
          .eq("scheduled_date", todayStr);

        const completed = new Set(
          (todaysChecks ?? []).map((c) => `${c.family_id}|${String(c.scheduled_time).slice(0, 5)}`),
        );

        let recorded = 0;
        let pushes = 0;
        const stale: string[] = [];

        for (const tm of times) {
          const [h, m] = tm.time_of_day.split(":").map(Number);
          const slotMin = h * 60 + m;
          const closedAt = slotMin + CARE_PLACE_WINDOW_MIN + (tm.grace_minutes ?? 30);
          if (nowMin < closedAt) continue; // still inside window or grace
          const key = `${tm.family_id}|${tm.time_of_day.slice(0, 5)}`;
          if (completed.has(key)) continue;

          // Idempotent insert.
          const { data: inserted, error: iErr } = await supabaseAdmin
            .from("care_place_missed_checks")
            .insert({
              family_id: tm.family_id,
              time_id: tm.id,
              scheduled_date: todayStr,
              scheduled_time: tm.time_of_day,
            })
            .select("id")
            .maybeSingle();
          if (iErr) {
            // Likely duplicate from a previous sweep — skip silently.
            continue;
          }
          if (!inserted) continue;
          recorded++;

          if (!vapidPrivate) continue;

          const { data: subs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("family_id", tm.family_id);
          if (!subs?.length) continue;

          const slot = tm.time_of_day.slice(0, 5);
          const payload = JSON.stringify({
            title: "⚠️ Missad kontroll",
            body: `${slot}-kontrollen missades idag${tm.label ? ` (${tm.label})` : ""}.`,
            tag: `missed-${tm.family_id}-${todayStr}-${slot}`,
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
                pushes++;
              } catch (e: unknown) {
                const status = (e as { statusCode?: number })?.statusCode;
                if (status === 404 || status === 410) stale.push(s.endpoint);
              }
            }),
          );

          await supabaseAdmin
            .from("care_place_missed_checks")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", inserted.id);
        }

        if (stale.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
        }

        return Response.json({ ok: true, missed: recorded, pushes });
      },
    },
  },
});
