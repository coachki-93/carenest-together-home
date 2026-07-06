import { createFileRoute } from "@tanstack/react-router";
import { formatTimeIn } from "@/lib/time/family-tz";
import { authorizeCronRequest } from "@/lib/push/cron-auth";
import { VAPID_PUBLIC_KEY } from "@/lib/push/keys";

// Public cron endpoint. Called every minute by pg_cron with the project's
// anon `apikey` header. Runs three passes per call:
//
//   1. START   — appointments whose start time just arrived
//   2. LATE    — appointments still pending past `late_after_minutes`
//   3. MISSED  — appointments still pending past `missed_after_minutes`
//
// Each pass stamps a `*_notified_at` column on the row so we never push twice
// for the same transition, and skips any appointment that already has a
// completion (done/skipped/postponed) recorded for that occurrence.
//
// Times are rendered in the family's timezone; body copy in the family's
// notification_language (sv | en). Both live on `public.families`.

type Appt = {
  id: string;
  family_id: string;
  title: string | null;
  kind: string | null;
  starts_at: string;
  late_after_minutes?: number | null;
  missed_after_minutes?: number | null;
};

type Sub = { endpoint: string; p256dh: string; auth: string };

type WebPushModule = {
  setVapidDetails: (subject: string, pub: string, priv: string) => void;
  sendNotification: (
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    opts?: { TTL?: number },
  ) => Promise<unknown>;
};

const KIND_LABELS = {
  sv: {
    temperature: "Temperatur",
    heart_rate: "Puls",
    spo2: "Syrgas",
    breathing: "Andning",
    fluids: "Vätska",
    diaper: "Blöja",
    seizure: "Anfall",
    meal: "Måltid",
    sleep: "Sömn",
    therapy: "Terapi",
    appointment: "Möte",
    note: "Anteckning",
    task: "Uppgift",
  },
  en: {
    temperature: "Temperature",
    heart_rate: "Heart rate",
    spo2: "Oxygen",
    breathing: "Breathing",
    fluids: "Fluids",
    diaper: "Diaper",
    seizure: "Seizure",
    meal: "Meal",
    sleep: "Sleep",
    therapy: "Therapy",
    appointment: "Appointment",
    note: "Note",
    task: "Task",
  },
} as const;

const COPY = {
  sv: {
    lateTitle: (t: string) => `⏰ ${t}`,
    lateBody: (time: string) => `Försenad sedan ${time}`,
    missedTitle: (t: string) => `❗ ${t}`,
    missedBody: (time: string) => `Missad — planerad ${time}`,
  },
  en: {
    lateTitle: (t: string) => `⏰ ${t}`,
    lateBody: (time: string) => `Late since ${time}`,
    missedTitle: (t: string) => `❗ ${t}`,
    missedBody: (time: string) => `Missed — scheduled ${time}`,
  },
} as const;

type Lang = keyof typeof COPY;

function humanKind(kind: string | null, lang: Lang): string {
  const table = KIND_LABELS[lang];
  const key = (kind ?? "task") as keyof typeof table;
  return table[key] ?? table.task;
}

export const Route = createFileRoute("/api/public/hooks/dispatch-task-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authorizeCronRequest(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const webpush = ((await import("web-push")) as unknown as { default: WebPushModule }).default;

        const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
        const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@carenest.app";
        if (!vapidPrivate) {
          return Response.json({ ok: false, error: "Missing VAPID_PRIVATE_KEY" }, { status: 500 });
        }
        webpush.setVapidDetails(vapidSubject, VAPID_PUBLIC_KEY, vapidPrivate);

        const now = new Date();
        const nowIso = now.toISOString();
        const staleEndpoints: string[] = [];
        let dispatched = 0;

        // Preload per-family timezone + language once.
        const { data: allFams } = await supabaseAdmin
          .from("families")
          .select("id, timezone, notification_language");
        const famInfo = new Map<string, { tz: string; lang: Lang }>(
          (allFams ?? []).map((f) => [
            f.id,
            {
              tz: f.timezone ?? "Europe/Stockholm",
              lang: (f.notification_language === "en" ? "en" : "sv") as Lang,
            },
          ]),
        );
        const infoFor = (familyId: string) =>
          famInfo.get(familyId) ?? { tz: "Europe/Stockholm", lang: "sv" as Lang };

        const getSubs = async (familyId: string): Promise<Sub[]> => {
          const { data } = await supabaseAdmin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("family_id", familyId);
          return (data ?? []) as Sub[];
        };

        const fanout = async (
          familyId: string,
          payload: { title: string; body: string; tag: string; url: string },
        ) => {
          const subs = await getSubs(familyId);
          if (subs.length === 0) return;
          const json = JSON.stringify(payload);
          await Promise.allSettled(
            subs.map(async (s) => {
              try {
                await webpush.sendNotification(
                  { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                  json,
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
        };

        // -------- PASS 1: start-time --------
        const startWindow = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
        const { data: startAppts } = await supabaseAdmin
          .from("appointments")
          .select("id, family_id, title, kind, starts_at")
          .is("notified_at", null)
          .gte("starts_at", startWindow)
          .lte("starts_at", nowIso)
          .limit(200);

        for (const a of (startAppts ?? []) as Appt[]) {
          const { tz, lang } = infoFor(a.family_id);
          await fanout(a.family_id, {
            title: a.title || "CareNest",
            body: `${humanKind(a.kind, lang)} • ${formatTimeIn(a.starts_at, tz)}`,
            tag: `appt-${a.id}-start`,
            url: "/dashboard",
          });
          await supabaseAdmin
            .from("appointments")
            .update({ notified_at: nowIso })
            .eq("id", a.id);
        }

        const recentWindow = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // -------- PASS 2: late --------
        const { data: lateCandidates } = await supabaseAdmin
          .from("appointments")
          .select(
            "id, family_id, title, kind, starts_at, late_after_minutes, missed_after_minutes",
          )
          .is("late_notified_at", null)
          .gte("starts_at", recentWindow)
          .lte("starts_at", nowIso)
          .eq("all_day", false)
          .limit(500);

        for (const a of (lateCandidates ?? []) as Appt[]) {
          const lateMin = a.late_after_minutes ?? 0;
          const dueAt = new Date(new Date(a.starts_at).getTime() + lateMin * 60_000);
          if (dueAt > now) continue;
          if (await hasCompletion(supabaseAdmin, a.id, a.starts_at)) continue;

          const { tz, lang } = infoFor(a.family_id);
          const title = a.title || "CareNest";
          await fanout(a.family_id, {
            title: COPY[lang].lateTitle(title),
            body: COPY[lang].lateBody(formatTimeIn(a.starts_at, tz)),
            tag: `appt-${a.id}-late`,
            url: "/dashboard",
          });
          await supabaseAdmin
            .from("appointments")
            .update({ late_notified_at: nowIso })
            .eq("id", a.id);
        }

        // -------- PASS 3: missed --------
        const { data: missedCandidates } = await supabaseAdmin
          .from("appointments")
          .select(
            "id, family_id, title, kind, starts_at, late_after_minutes, missed_after_minutes",
          )
          .is("missed_notified_at", null)
          .gte("starts_at", recentWindow)
          .lte("starts_at", nowIso)
          .eq("all_day", false)
          .limit(500);

        for (const a of (missedCandidates ?? []) as Appt[]) {
          const missedMin = a.missed_after_minutes ?? 15;
          const dueAt = new Date(new Date(a.starts_at).getTime() + missedMin * 60_000);
          if (dueAt > now) continue;
          if (await hasCompletion(supabaseAdmin, a.id, a.starts_at)) continue;

          const { tz, lang } = infoFor(a.family_id);
          const title = a.title || "CareNest";
          await fanout(a.family_id, {
            title: COPY[lang].missedTitle(title),
            body: COPY[lang].missedBody(formatTimeIn(a.starts_at, tz)),
            tag: `appt-${a.id}-missed`,
            url: "/dashboard",
          });
          await supabaseAdmin
            .from("appointments")
            .update({ missed_notified_at: nowIso })
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
          dispatched,
          cleaned: staleEndpoints.length,
        });
      },
    },
  },
});

async function hasCompletion(
  client: Awaited<
    ReturnType<typeof import("@/integrations/supabase/client.server")["supabaseAdmin"]["from"]>
  > extends never
    ? never
    : import("@supabase/supabase-js").SupabaseClient,
  appointmentId: string,
  occurrenceAt: string,
): Promise<boolean> {
  const { data } = await client
    .from("appointment_completions")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("occurrence_at", occurrenceAt)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}
