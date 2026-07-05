import { createFileRoute } from "@tanstack/react-router";
import { wallClockIn, yesterdayStrIn } from "@/lib/time/family-tz";

/**
 * Sweeps for Care Place Control slots whose grace window has expired today
 * (in the family's local timezone) with no completed check, writes a marker
 * row in `care_place_missed_checks`, and dispatches one push per family.
 * Idempotent via UNIQUE (family_id, time_id, scheduled_date).
 *
 * Triggered every ~5 minutes by pg_cron with the project's `apikey` header.
 *
 * BACKLOG: slots whose (time_of_day + grace_minutes) crosses local midnight
 * can never satisfy `nowMin >= closedAt` under a single-day comparison and
 * will never be marked missed. Pre-existing bug; not addressed here.
 */

// Push message copy per language. Kept inline to avoid pulling i18next into
// the server bundle for four strings.
const MESSAGES = {
  sv: {
    title: "⚠️ Missad kontroll",
    body: (slot: string, label: string | null) =>
      `${slot}-kontrollen missades idag${label ? ` (${label})` : ""}.`,
  },
  en: {
    title: "⚠️ Missed check",
    body: (slot: string, label: string | null) =>
      `The ${slot} check was missed today${label ? ` (${label})` : ""}.`,
  },
} as const;

type Lang = keyof typeof MESSAGES;

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

        const now = new Date();

        const { data: times, error: tErr } = await supabaseAdmin
          .from("care_place_check_times")
          .select("id, family_id, time_of_day, grace_minutes, label")
          .eq("active", true);
        if (tErr) return Response.json({ ok: false, error: tErr.message }, { status: 500 });
        if (!times?.length) return Response.json({ ok: true, missed: 0 });

        // Load per-family settings once: hospital mode, timezone, language.
        const familyIds = Array.from(new Set(times.map((t) => t.family_id)));
        const { data: fams } = await supabaseAdmin
          .from("families")
          .select("id, at_hospital_since, timezone, notification_language")
          .in("id", familyIds);
        const famInfo = new Map<
          string,
          { tz: string; lang: Lang; hospital: boolean }
        >(
          (fams ?? []).map((f) => [
            f.id,
            {
              tz: f.timezone ?? "Europe/Stockholm",
              lang: (f.notification_language === "en" ? "en" : "sv") as Lang,
              hospital: !!f.at_hospital_since,
            },
          ]),
        );

        // Because todayStr is now per-family, midnight-adjacent families
        // could roll into a new local date while the completions table still
        // holds yesterday's rows. Fetch a two-day window and key by
        // (family_id, scheduled_date, HH:mm).
        const utcToday = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
        const utcYesterday = (() => {
          const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        })();
        const utcTomorrow = (() => {
          const d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        })();

        const { data: recentChecks } = await supabaseAdmin
          .from("care_place_checks")
          .select("family_id, scheduled_date, scheduled_time")
          .in("scheduled_date", [utcYesterday, utcToday, utcTomorrow]);

        const completed = new Set(
          (recentChecks ?? []).map(
            (c) =>
              `${c.family_id}|${c.scheduled_date}|${String(c.scheduled_time).slice(0, 5)}`,
          ),
        );

        let recorded = 0;
        let pushes = 0;
        const stale: string[] = [];

        for (const tm of times) {
          const info = famInfo.get(tm.family_id);
          if (info?.hospital) continue;
          const tz = info?.tz ?? "Europe/Stockholm";
          const lang: Lang = info?.lang ?? "sv";

          const { todayStr, nowMin } = wallClockIn(now, tz);

          const [h, m] = tm.time_of_day.split(":").map(Number);
          const slotMin = h * 60 + m;
          const closedAt = slotMin + (tm.grace_minutes ?? 30);
          if (nowMin < closedAt) continue;

          const slot = tm.time_of_day.slice(0, 5);
          if (completed.has(`${tm.family_id}|${todayStr}|${slot}`)) continue;

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
          if (iErr) continue;
          if (!inserted) continue;
          recorded++;

          if (!vapidPrivate) continue;

          const { data: subs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("family_id", tm.family_id);
          if (!subs?.length) continue;

          const msg = MESSAGES[lang];
          const payload = JSON.stringify({
            title: msg.title,
            body: msg.body(slot, tm.label ?? null),
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
