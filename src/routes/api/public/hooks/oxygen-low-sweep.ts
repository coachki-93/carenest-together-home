import { createFileRoute } from "@tanstack/react-router";
import { computeRemaining, type OxygenTankRow } from "@/lib/oxygen/tanks";

/**
 * Scans every active oxygen tank and pushes one notification when remaining
 * time falls below the family's warn / critical thresholds. Each tank gets
 * at most one "low" and one "critical" push (stamped via
 * `low_alert_sent_at` / `critical_alert_sent_at`). Paused tanks are skipped.
 *
 * Triggered every ~15 minutes by pg_cron with the project's `apikey` header.
 */
export const Route = createFileRoute("/api/public/hooks/oxygen-low-sweep")({
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

        const { data: tanks } = await supabaseAdmin
          .from("oxygen_tanks")
          .select(
            "id, family_id, tank_type, flow_lpm, started_at, replaced_at, notes, paused_at, paused_seconds, low_alert_sent_at, critical_alert_sent_at",
          )
          .is("replaced_at", null);

        const { data: families } = await supabaseAdmin
          .from("families")
          .select("id, oxygen_warn_minutes, oxygen_critical_minutes, at_hospital_since");
        const famSettings = new Map<string, { warn: number; crit: number }>(
          (families ?? []).map((f) => [
            f.id,
            {
              warn: f.oxygen_warn_minutes ?? 60,
              crit: f.oxygen_critical_minutes ?? 20,
            },
          ]),
        );
        // Families currently at hospital have hospital-supplied oxygen, so we
        // skip low-tank pushes for them entirely.
        const hospitalFamilyIds = new Set<string>(
          (families ?? []).filter((f) => f.at_hospital_since).map((f) => f.id),
        );

        let pushes = 0;
        const stale: string[] = [];
        const nowIso = new Date().toISOString();

        for (const tank of tanks ?? []) {
          if (tank.paused_at) continue;
          if (hospitalFamilyIds.has(tank.family_id)) continue;
          const info = computeRemaining(tank as unknown as OxygenTankRow);
          if (!info) continue;
          const { warn, crit } = famSettings.get(tank.family_id) ?? { warn: 60, crit: 20 };
          const remaining = info.remainingMinutes;

          let kind: "critical" | "low" | null = null;
          if (remaining <= crit && !tank.critical_alert_sent_at) kind = "critical";
          else if (remaining <= warn && !tank.low_alert_sent_at) kind = "low";
          if (!kind) continue;

          if (vapidPrivate) {
            const { data: subs } = await supabaseAdmin
              .from("push_subscriptions")
              .select("endpoint, p256dh, auth")
              .eq("family_id", tank.family_id);

            if (subs?.length) {
              const mins = Math.round(remaining);
              const payload = JSON.stringify({
                title:
                  kind === "critical"
                    ? "🟥 Syrgastub nästan tom"
                    : "🟧 Syrgastub låg",
                body:
                  kind === "critical"
                    ? `Endast ~${mins} min kvar i aktuell tub. Byt snart.`
                    : `~${mins} min kvar i aktuell tub. Förbered byte.`,
                tag: `oxygen-${kind}-${tank.id}`,
                url: "/oxygen",
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
            }
          }

          const patch =
            kind === "critical"
              ? { critical_alert_sent_at: nowIso, low_alert_sent_at: tank.low_alert_sent_at ?? nowIso }
              : { low_alert_sent_at: nowIso };
          await supabaseAdmin.from("oxygen_tanks").update(patch).eq("id", tank.id);
        }

        if (stale.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
        }

        return Response.json({ ok: true, pushes });
      },
    },
  },
});
