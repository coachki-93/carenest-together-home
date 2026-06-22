import { createFileRoute } from "@tanstack/react-router";

// Public cron endpoint. Called every minute by pg_cron with the project's
// anon `apikey` header. Runs three passes per call:
//
//   1. START   — appointments whose start time just arrived (existing flow)
//   2. LATE    — appointments still pending past `late_after_minutes`
//   3. MISSED  — appointments still pending past `missed_after_minutes`
//
// Each pass stamps a `*_notified_at` column on the row so we never push twice
// for the same transition, and skips any appointment that already has a
// completion (done/skipped/postponed) recorded for that occurrence.
//
// Auth model: /api/public/* bypasses Lovable's edge auth. We additionally
// verify the `apikey` header matches the project's anon publishable key so
// random callers can't trigger fan-out.

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
        const webpush = ((await import("web-push")) as unknown as { default: WebPushModule }).default;

        const vapidPublic =
          "BKhqzimlxSXKmf1FK9n0jaINDW5QKsWBwQBD_LZYhpE2GPPdLIDPQAQz2oo4UNQP0riQtptO71Mu2zU5cvoyP38";
        const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
        const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@carenest.app";
        if (!vapidPrivate) {
          return Response.json({ ok: false, error: "Missing VAPID_PRIVATE_KEY" }, { status: 500 });
        }
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

        const now = new Date();
        const nowIso = now.toISOString();
        const staleEndpoints: string[] = [];
        let dispatched = 0;

        // Helper: fetch subs for a family
        const getSubs = async (familyId: string): Promise<Sub[]> => {
          const { data } = await supabaseAdmin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("family_id", familyId);
          return (data ?? []) as Sub[];
        };

        // Helper: push to all subs
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

        const fmtTime = (iso: string) =>
          new Date(iso).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          });

        // -------- PASS 1: start-time --------
        // Anything that should have fired in the last 2 minutes and is still
        // unnotified. 2 min gives slack for cron drift.
        const startWindow = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
        const { data: startAppts } = await supabaseAdmin
          .from("appointments")
          .select("id, family_id, title, kind, starts_at")
          .is("notified_at", null)
          .gte("starts_at", startWindow)
          .lte("starts_at", nowIso)
          .limit(200);

        for (const a of (startAppts ?? []) as Appt[]) {
          await fanout(a.family_id, {
            title: a.title || "CareNest",
            body: `${humanKind(a.kind)} • ${fmtTime(a.starts_at)}`,
            tag: `appt-${a.id}-start`,
            url: "/dashboard",
          });
          await supabaseAdmin
            .from("appointments")
            .update({ notified_at: nowIso })
            .eq("id", a.id);
        }

        // -------- PASS 2: late --------
        // starts_at + late_after_minutes <= now, no late_notified_at, no
        // completion logged for this occurrence yet.
        const { data: lateCandidates } = await supabaseAdmin
          .from("appointments")
          .select(
            "id, family_id, title, kind, starts_at, late_after_minutes, missed_after_minutes",
          )
          .is("late_notified_at", null)
          .lte("starts_at", nowIso)
          .eq("all_day", false)
          .limit(500);

        for (const a of (lateCandidates ?? []) as Appt[]) {
          const lateMin = a.late_after_minutes ?? 0;
          const dueAt = new Date(new Date(a.starts_at).getTime() + lateMin * 60_000);
          if (dueAt > now) continue;

          if (await hasCompletion(supabaseAdmin, a.id, a.starts_at)) continue;

          await fanout(a.family_id, {
            title: `⏰ ${a.title || "CareNest"}`,
            body: `Late since ${fmtTime(a.starts_at)}`,
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
          .lte("starts_at", nowIso)
          .eq("all_day", false)
          .limit(500);

        for (const a of (missedCandidates ?? []) as Appt[]) {
          const missedMin = a.missed_after_minutes ?? 15;
          const dueAt = new Date(new Date(a.starts_at).getTime() + missedMin * 60_000);
          if (dueAt > now) continue;

          if (await hasCompletion(supabaseAdmin, a.id, a.starts_at)) continue;

          await fanout(a.family_id, {
            title: `❗ ${a.title || "CareNest"}`,
            body: `Missed — scheduled ${fmtTime(a.starts_at)}`,
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
  client: { from: (t: string) => unknown },
  appointmentId: string,
  occurrenceAt: string,
): Promise<boolean> {
  const builder = (client as { from: (t: string) => { select: (c: string) => unknown } })
    .from("appointment_completions")
    .select("id") as unknown as {
      eq: (k: string, v: string) => {
        eq: (k: string, v: string) => {
          limit: (n: number) => Promise<{ data: { id: string }[] | null }>;
        };
      };
    };
  const { data } = await builder
    .eq("appointment_id", appointmentId)
    .eq("occurrence_at", occurrenceAt)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

function humanKind(kind: string | null): string {
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
