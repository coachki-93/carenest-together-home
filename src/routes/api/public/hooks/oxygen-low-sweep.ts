import { fetchAllPages } from "@/lib/push/batching";
import { createFileRoute } from "@tanstack/react-router";
import { computeRemaining, durationMinutes, type OxygenTankRow, type TankType } from "@/lib/oxygen/tanks";
import { authorizeCronRequest } from "@/lib/push/cron-auth";
import { VAPID_PUBLIC_KEY } from "@/lib/push/keys";
import { createRecipientResolver } from "@/lib/push/recipients";
import { isPaused } from "@/lib/hospital/paused";
import { shouldNagManualPause, shouldSendCheckReminder } from "@/lib/oxygen/check-reminder";
import { formatTimeIn } from "@/lib/time/family-tz";

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
        const unauthorized = await authorizeCronRequest(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const webpush = (await import("web-push")).default;

        const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
        const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@carenest.app";
        if (vapidPrivate) {
          webpush.setVapidDetails(vapidSubject, VAPID_PUBLIC_KEY, vapidPrivate);
        }


        const { data: tanks } = await supabaseAdmin
          .from("oxygen_tanks")
          .select(
            "id, family_id, tank_type, flow_lpm, started_at, replaced_at, notes, paused_at, pause_reason, paused_seconds, low_alert_sent_at, critical_alert_sent_at, updated_at, last_checked_at, check_reminder_sent_at",
          )
          .is("replaced_at", null);

        const { rows: families, error: famErr } = await fetchAllPages((from, to) =>
          supabaseAdmin
            .from("families")
            .select(
              "id, oxygen_warn_minutes, oxygen_critical_minutes, oxygen_check_interval_minutes, at_hospital_since, hospital_paused, notification_language, timezone",
            )
            .order("id")
            .range(from, to),
        );
        if (famErr) console.error("oxygen-sweep: families query failed", famErr.message);
        const famSettings = new Map<
          string,
          { warn: number; crit: number; checkInterval: number | null; lang: "sv" | "en"; tz: string }
        >(
          (families ?? []).map((f) => [
            f.id,
            {
              warn: f.oxygen_warn_minutes ?? 60,
              crit: f.oxygen_critical_minutes ?? 20,
              checkInterval: f.oxygen_check_interval_minutes ?? null,
              lang: (f.notification_language === "en" ? "en" : "sv") as "sv" | "en",
              tz: f.timezone ?? "Europe/Stockholm",
            },
          ]),
        );
        // Families that paused the "oxygen" category (default: on while at
        // hospital) skip low-tank pushes — the hospital supplies oxygen.
        const oxygenPausedFamilyIds = new Set<string>(
          (families ?? [])
            .filter((f) =>
              isPaused(
                { at_hospital_since: f.at_hospital_since, hospital_paused: f.hospital_paused },
                "oxygen",
              ),
            )
            .map((f) => f.id),
        );

        const OX_COPY = {
          sv: {
            criticalTitle: "🟥 Syrgastub nästan tom",
            lowTitle: "🟧 Syrgastub låg",
            criticalBody: (m: number) =>
              `Endast ~${m} min kvar i aktuell tub. Byt snart.`,
            lowBody: (m: number) => `~${m} min kvar i aktuell tub. Förbered byte.`,
            checkTitle: "🫁 Kontrollera syrgastuben",
            checkBody: (flow: string) =>
              `Bekräfta nivå och flöde. Appen räknar med ${flow} l/min — stämmer det?`,
            pausedTitle: "⏸️ Syrgasen är pausad",
            pausedBody: (time: string) =>
              `Pausad sedan ${time}. Fortfarande avstängd? Tryck Återuppta i appen när ni kopplar på igen.`,
          },
          en: {
            criticalTitle: "🟥 Oxygen tank nearly empty",
            lowTitle: "🟧 Oxygen tank low",
            criticalBody: (m: number) =>
              `Only ~${m} min left in the current tank. Change soon.`,
            lowBody: (m: number) =>
              `~${m} min left in the current tank. Prepare a change.`,
            checkTitle: "🫁 Check the oxygen tank",
            checkBody: (flow: string) =>
              `Confirm the level and flow. The app assumes ${flow} l/min — is that still correct?`,
            pausedTitle: "⏸️ Oxygen is paused",
            pausedBody: (time: string) =>
              `Paused since ${time}. Still off? Tap Resume in the app when you reconnect.`,
          },
        } as const;

        let pushes = 0;
        let checkPushes = 0;
        const stale: string[] = [];
        const nowIso = new Date().toISOString();
        const recipients = createRecipientResolver(supabaseAdmin);

        const sendToFamily = async (
          familyId: string,
          category: "critical" | "oxygen",
          payload: string,
        ) => {
          const subs = await recipients.getRecipients(familyId, category);
          if (!subs.length) return 0;
          let sent = 0;
          await Promise.allSettled(
            subs.map(async (s) => {
              try {
                await webpush.sendNotification(
                  { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                  payload,
                  { TTL: 60 * 60 },
                );
                sent++;
              } catch (e: unknown) {
                const status = (e as { statusCode?: number })?.statusCode;
                if (status === 404 || status === 410) stale.push(s.endpoint);
              }
            }),
          );
          return sent;
        };

        for (const tank of tanks ?? []) {
          try {
            const { warn, crit, checkInterval, lang, tz } = famSettings.get(tank.family_id) ?? {
              warn: 60,
              crit: 20,
              checkInterval: null,
              lang: "sv" as const,
              tz: "Europe/Stockholm",
            };
            const copy = OX_COPY[lang];

            if (tank.paused_at) {
              // Hospital-paused tanks — and families that paused the oxygen
              // category at hospital — stay fully silent, as before.
              if (oxygenPausedFamilyIds.has(tank.family_id)) continue;
              if (!shouldNagManualPause({ pausedAt: tank.paused_at, pauseReason: tank.pause_reason })) continue;

              // Manually paused at home: no depletion alarms (Pass A) and no
              // normal check reminder (Pass B) — the countdown is frozen.
              // Instead, nag periodically so a forgotten pause is never
              // silently permanent. The clock runs from paused_at.
              if (
                shouldSendCheckReminder({
                  startedAt: tank.paused_at,
                  lastCheckedAt: tank.last_checked_at,
                  tankTotalMinutes: null,
                  checkReminderSentAt: tank.check_reminder_sent_at,
                  intervalMinutes: checkInterval,
                  now: new Date(nowIso),
                })
              ) {
                if (vapidPrivate) {
                  checkPushes += await sendToFamily(
                    tank.family_id,
                    "oxygen",
                    JSON.stringify({
                      title: copy.pausedTitle,
                      body: copy.pausedBody(formatTimeIn(tank.paused_at, tz)),
                      tag: `oxygen-paused-${tank.id}`,
                      url: "/oxygen",
                    }),
                  );
                }
                await supabaseAdmin
                  .from("oxygen_tanks")
                  .update({ check_reminder_sent_at: nowIso })
                  .eq("id", tank.id);
              }
              continue;
            }

            if (oxygenPausedFamilyIds.has(tank.family_id)) continue;

            // ---- Pass A: depletion-estimate driven low / critical alarms.
            // Isolated so a null or throwing estimate cannot skip Pass B.
            try {
              const info = computeRemaining(tank as unknown as OxygenTankRow);
              if (info) {
                const remaining = info.remainingMinutes;
                let kind: "critical" | "low" | null = null;
                if (remaining <= crit && !tank.critical_alert_sent_at) kind = "critical";
                else if (remaining <= warn && !tank.low_alert_sent_at) kind = "low";

                if (kind) {
                  if (vapidPrivate) {
                    const mins = Math.round(remaining);
                    pushes += await sendToFamily(
                      tank.family_id,
                      kind === "critical" ? "critical" : "oxygen",
                      JSON.stringify({
                        title: kind === "critical" ? copy.criticalTitle : copy.lowTitle,
                        body:
                          kind === "critical"
                            ? copy.criticalBody(mins)
                            : copy.lowBody(mins),
                        tag: `oxygen-${kind}-${tank.id}`,
                        url: "/oxygen",
                      }),
                    );
                  }

                  const patch =
                    kind === "critical"
                      ? {
                          critical_alert_sent_at: nowIso,
                          low_alert_sent_at: tank.low_alert_sent_at ?? nowIso,
                        }
                      : { low_alert_sent_at: nowIso };
                  await supabaseAdmin.from("oxygen_tanks").update(patch).eq("id", tank.id);
                }
              }
            } catch {
              // Estimate or low/critical delivery failed — keep going so the
              // independent check reminder below still runs for this tank.
            }

            // ---- Pass B: periodic "confirm the tank" reminder.
            // Timestamps + interval only; never depends on computeRemaining.
            if (
              shouldSendCheckReminder({
                startedAt: tank.started_at,
                lastCheckedAt: tank.last_checked_at,
                tankTotalMinutes: durationMinutes(tank.tank_type as TankType, Number(tank.flow_lpm)),
                checkReminderSentAt: tank.check_reminder_sent_at,
                intervalMinutes: checkInterval,
                now: new Date(nowIso),
              })
            ) {
              if (vapidPrivate) {
                const flow = String(tank.flow_lpm ?? "?");
                checkPushes += await sendToFamily(
                  tank.family_id,
                  "oxygen",
                  JSON.stringify({
                    title: copy.checkTitle,
                    body: copy.checkBody(flow),
                    tag: `oxygen-check-${tank.id}`,
                    url: "/oxygen",
                  }),
                );
              }
              await supabaseAdmin
                .from("oxygen_tanks")
                .update({ check_reminder_sent_at: nowIso })
                .eq("id", tank.id);
            }
          } catch {
            // One bad tank must never abort the sweep for the others.
          }
        }

        if (stale.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
        }

        return Response.json({ ok: true, pushes, checkPushes });
      },
    },
  },
});
