import { createFileRoute } from "@tanstack/react-router";
import { formatTimeIn, wallClockIn } from "@/lib/time/family-tz";
import { authorizeCronRequest } from "@/lib/push/cron-auth";
import { VAPID_PUBLIC_KEY } from "@/lib/push/keys";
import { createRecipientResolver, type NotifyCategory } from "@/lib/push/recipients";
import { isPaused } from "@/lib/hospital/paused";
import { fetchAllPages, fetchInChunks } from "@/lib/push/batching";
import {
  DEFAULT_FAMILY_TZ,
  expandRecurrence,
} from "@/lib/schedule/recurrence";
import {
  MOVE_LOOKAHEAD_MS,
  expandMasterForSweep,
  isLateDue,
  isMissedDue,
  isReminderDue,
  isStartDue,
  type OverrideLike,
  type SweepOccurrence,
} from "@/lib/schedule/sweep-occurrences";

// Public cron endpoint. Called every minute by pg_cron with the project's
// anon `apikey` header. Runs four passes per call, all deduped per-occurrence
// via insert-if-absent into `public.appointment_notifications`
// (PK: appointment_id, occurrence_at, pass):
//
//   1. START     — occurrence time just arrived (within START_GRACE_MINUTES)
//   2. LATE      — now ≥ occurrence + late_after_minutes
//   3. MISSED    — now ≥ occurrence + missed_after_minutes
//   4. REMINDER  — now ≥ occurrence − reminder_minutes (look-ahead)
//
// Recurring masters are expanded into occurrences and each occurrence dedupes
// independently. Non-cancelled override child rows contribute their own
// occurrence (shifted time / thresholds). LATE and MISSED skip occurrences
// that already have a completion recorded.
//
// Times are rendered in the family's timezone; body copy in the family's
// notification_language (sv | en). Both live on `public.families`.

/**
 * START catch-up window. If cron lags or the endpoint recovers late, START
 * can still fire up to this many minutes after an occurrence time. Beyond
 * this window LATE takes over — the two never overlap for the same
 * occurrence, so no double-push. Also naturally bounds any first-run burst
 * after deploy: only occurrences within the last 15 min can produce START.
 */
const START_GRACE_MINUTES = 15;


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

        // Preload per-family timezone + language + hospital-pause once.
        const { rows: allFams, error: famErr } = await fetchAllPages((from, to) =>
          supabaseAdmin
            .from("families")
            .select("id, timezone, notification_language, at_hospital_since, hospital_paused")
            .order("id")
            .range(from, to),
        );
        if (famErr) console.error("task-sweep: families query failed", famErr.message);
        const famInfo = new Map<
          string,
          { tz: string; lang: Lang; tasksPaused: boolean }
        >(
          (allFams ?? []).map((f) => [
            f.id,
            {
              tz: f.timezone ?? DEFAULT_FAMILY_TZ,
              lang: (f.notification_language === "en" ? "en" : "sv") as Lang,
              tasksPaused: isPaused(
                { at_hospital_since: f.at_hospital_since, hospital_paused: f.hospital_paused },
                "tasks",
              ),
            },
          ]),
        );
        const infoFor = (familyId: string) =>
          famInfo.get(familyId) ?? {
            tz: DEFAULT_FAMILY_TZ,
            lang: "sv" as Lang,
            tasksPaused: false,
          };

        const recipients = createRecipientResolver(supabaseAdmin);

        const fanout = async (
          familyId: string,
          category: NotifyCategory,
          payload: { title: string; body: string; tag: string; url: string },
        ) => {
          const subs = await recipients.getRecipients(familyId, category);
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

        // ================================================================
        // PASSES 1-3: START / LATE / MISSED (per-occurrence dedupe)
        // ----------------------------------------------------------------
        // Shared expansion. Look back RECENT_WINDOW_DAYS; occurrences beyond
        // that are cold and won't fire even without a dedupe row (bounded
        // history walk).
        const RECENT_WINDOW_DAYS = 7;
        const windowStart = new Date(
          now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        );
        const windowStartIso = windowStart.toISOString();

        type SLMRow = {
          id: string;
          family_id: string;
          title: string | null;
          kind: string | null;
          starts_at: string;
          all_day: boolean;
          late_after_minutes: number | null;
          missed_after_minutes: number | null;
          recurrence_freq: string | null;
          recurrence_interval: number | null;
          recurrence_byweekday: number[] | null;
          recurrence_times_of_day: string[] | null;
          recurrence_parent_id: string | null;
          recurrence_override_at: string | null;
          recurrence_cancelled: boolean | null;
          notify_start: boolean | null;
        };

        const slmSelect =
          "id, family_id, title, kind, starts_at, all_day, late_after_minutes, missed_after_minutes, recurrence_freq, recurrence_interval, recurrence_byweekday, recurrence_times_of_day, recurrence_parent_id, recurrence_override_at, recurrence_cancelled, notify_start";

        // Non-recurring, non-override rows whose single occurrence lands in
        // the window.
        const plainRes = await fetchAllPages<SLMRow>((from, to) =>
          supabaseAdmin
            .from("appointments")
            .select(slmSelect)
            .is("recurrence_freq", null)
            .is("recurrence_parent_id", null)
            .eq("all_day", false)
            .gte("starts_at", windowStartIso)
            .lte("starts_at", nowIso)
            .order("id")
            .range(from, to) as never,
        );
        if (plainRes.error)
          console.error("task-sweep slm: plain rows query failed", plainRes.error.message);
        const slmPlainRows = plainRes.rows;

        // All recurring masters (infinite series — no time filter). Paged so
        // no master is ever dropped by the 1000-row API cap.
        const masterRes = await fetchAllPages<SLMRow>((from, to) =>
          supabaseAdmin
            .from("appointments")
            .select(slmSelect)
            .not("recurrence_freq", "is", null)
            .is("recurrence_parent_id", null)
            .eq("all_day", false)
            .order("id")
            .range(from, to) as never,
        );
        if (masterRes.error)
          console.error("task-sweep slm: masters query failed", masterRes.error.message);
        const slmMasters = masterRes.rows;

        // Overrides for those masters within the window. Non-cancelled
        // overrides *replace* the master's occurrence at that timestamp
        // (own title / starts_at / thresholds); cancelled overrides drop it.
        type SLMOverride = SLMRow & {
          recurrence_parent_id: string;
          recurrence_override_at: string;
        };
        let slmOverrides: SLMOverride[] = [];
        let slmFailedMasters = new Set<string>();
        if (slmMasters.length > 0) {
          const ovRes = await fetchInChunks<SLMRow>(
            slmMasters.map((m) => m.id),
            (ids) =>
              supabaseAdmin
                .from("appointments")
                .select(slmSelect)
                .in("recurrence_parent_id", ids)
                // Original slots up to MOVE_LOOKAHEAD either side, so moved
                // occurrences whose new time is in the window are found.
                .gte("recurrence_override_at", new Date(windowStart.getTime() - MOVE_LOOKAHEAD_MS).toISOString())
                .lte("recurrence_override_at", new Date(now.getTime() + MOVE_LOOKAHEAD_MS).toISOString()) as never,
          );
          for (const e of ovRes.errors)
            console.error("task-sweep slm: overrides chunk failed; skipping its masters", e);
          slmFailedMasters = ovRes.failedIds;
          slmOverrides = (ovRes.rows as unknown as SLMRow[]).filter(
            (r): r is SLMOverride =>
              !!r.recurrence_parent_id && !!r.recurrence_override_at,
          );
        }
        type SLMCandidate = SweepOccurrence;

        const slmCandidates: SLMCandidate[] = [];

        for (const p of (slmPlainRows ?? []) as SLMRow[]) {
          slmCandidates.push({
            master_id: p.id,
            occurrence_at: p.starts_at,
            occurrence_ms: new Date(p.starts_at).getTime(),
            family_id: p.family_id,
            title: p.title,
            kind: p.kind,
            late_after_minutes: p.late_after_minutes ?? 0,
            missed_after_minutes: p.missed_after_minutes ?? 15,
            notify_start: p.notify_start !== false,
            reminder_minutes: null,
          });
        }

        for (const m of slmMasters) {
          // Without override info we could push cancelled occurrences — skip.
          if (slmFailedMasters.has(m.id)) continue;
          slmCandidates.push(
            ...expandMasterForSweep(
              m,
              slmOverrides as OverrideLike[],
              windowStart.getTime(),
              now.getTime(),
              infoFor(m.family_id).tz,
            ),
          );
        }
        // Display the actual (possibly moved) time; key stays occurrence_at.
        const shownAt = (c: SweepOccurrence) => new Date(c.occurrence_ms).toISOString();

        // Try to insert the dedupe row first; only fanout on success. On PK
        // conflict PostgREST returns an error and we skip silently (same
        // pattern as the REMINDER pass).
        const tryClaim = async (
          appointmentId: string,
          occurrenceAt: string,
          pass: "start" | "late" | "missed",
        ): Promise<boolean> => {
          const { error } = await supabaseAdmin
            .from("appointment_notifications")
            .insert({
              appointment_id: appointmentId,
              occurrence_at: occurrenceAt,
              pass,
            } as never)
            .select("appointment_id");
          if (error && error.code !== "23505")
            console.error(`task-sweep ${pass}: dedupe insert failed`, error.message);
          return !error;
        };

        // -------- PASS 1: start (within START_GRACE_MINUTES) --------
        for (const c of slmCandidates) {
          if (infoFor(c.family_id).tasksPaused) continue;
          if (!isStartDue(c, now.getTime(), START_GRACE_MINUTES)) continue;
          if (!(await tryClaim(c.master_id, c.occurrence_at, "start"))) continue;

          const { tz, lang } = infoFor(c.family_id);
          await fanout(c.family_id, "start", {
            title: c.title || "Tillsa",
            body: `${humanKind(c.kind, lang)} • ${formatTimeIn(shownAt(c), tz)}`,
            tag: `appt-${c.master_id}-start-${c.occurrence_at}`,
            url: "/dashboard",
          });
        }

        // -------- PASS 2: late --------
        for (const c of slmCandidates) {
          if (infoFor(c.family_id).tasksPaused) continue;
          if (!isLateDue(c, now.getTime(), false)) continue;
          if (
            !isLateDue(c, now.getTime(), await hasCompletion(supabaseAdmin, c.master_id, c.occurrence_at))
          )
            continue;
          if (!(await tryClaim(c.master_id, c.occurrence_at, "late"))) continue;

          const { tz, lang } = infoFor(c.family_id);
          const title = c.title || "Tillsa";
          await fanout(c.family_id, "late", {
            title: COPY[lang].lateTitle(title),
            body: COPY[lang].lateBody(formatTimeIn(shownAt(c), tz)),
            tag: `appt-${c.master_id}-late-${c.occurrence_at}`,
            url: "/dashboard",
          });
        }

        // -------- PASS 3: missed --------
        for (const c of slmCandidates) {
          if (infoFor(c.family_id).tasksPaused) continue;
          if (!isMissedDue(c, now.getTime(), false)) continue;
          if (
            !isMissedDue(c, now.getTime(), await hasCompletion(supabaseAdmin, c.master_id, c.occurrence_at))
          )
            continue;
          if (!(await tryClaim(c.master_id, c.occurrence_at, "missed"))) continue;

          const { tz, lang } = infoFor(c.family_id);
          const title = c.title || "Tillsa";
          await fanout(c.family_id, "missed", {
            title: COPY[lang].missedTitle(title),
            body: COPY[lang].missedBody(formatTimeIn(shownAt(c), tz)),
            tag: `appt-${c.master_id}-missed-${c.occurrence_at}`,
            url: "/dashboard",
          });
        }


        // -------- PASS 4: reminder --------
        // Look ahead 2 days (matches max reminder = 1440 min = 1 day, with slack).
        // Same per-occurrence dedupe pattern as passes 1-3.
        const lookAheadEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const lookAheadIso = lookAheadEnd.toISOString();

        type ReminderRow = {
          id: string;
          family_id: string;
          title: string | null;
          starts_at: string;
          reminder_minutes: number | null;
          recurrence_freq: string | null;
          recurrence_interval: number | null;
          recurrence_byweekday: number[] | null;
          recurrence_times_of_day: string[] | null;
          ends_at: string | null;
          all_day: boolean;
        };

        // Non-recurring: starts_at in [now, now+2d]
        const reminderSelect =
          "id, family_id, title, starts_at, reminder_minutes, recurrence_freq, recurrence_interval, recurrence_byweekday, recurrence_times_of_day, ends_at, all_day";
        const remPlainRes = await fetchAllPages<ReminderRow>((from, to) =>
          supabaseAdmin
            .from("appointments")
            .select(reminderSelect)
            .not("reminder_minutes", "is", null)
            .is("recurrence_freq", null)
            .is("recurrence_parent_id", null)
            .eq("all_day", false)
            .gte("starts_at", nowIso)
            .lte("starts_at", lookAheadIso)
            .order("id")
            .range(from, to) as never,
        );
        if (remPlainRes.error)
          console.error("task-sweep reminder: plain rows query failed", remPlainRes.error.message);
        const plainRows = remPlainRes.rows;

        // Recurring masters with reminders
        const remMasterRes = await fetchAllPages<ReminderRow>((from, to) =>
          supabaseAdmin
            .from("appointments")
            .select(reminderSelect)
            .not("reminder_minutes", "is", null)
            .not("recurrence_freq", "is", null)
            .is("recurrence_parent_id", null)
            .eq("all_day", false)
            .order("id")
            .range(from, to) as never,
        );
        if (remMasterRes.error)
          console.error("task-sweep reminder: masters query failed", remMasterRes.error.message);

        // Load overrides for these masters within window (for cancel detection)
        const masters = remMasterRes.rows;
        type Override = OverrideLike;
        let overrides: Override[] = [];
        let remFailedMasters = new Set<string>();
        if (masters.length > 0) {
          const ovRes = await fetchInChunks<Override>(
            masters.map((m) => m.id),
            (ids) =>
              supabaseAdmin
                .from("appointments")
                .select("recurrence_parent_id, recurrence_override_at, recurrence_cancelled, starts_at, title, kind")
                .in("recurrence_parent_id", ids)
                .gte("recurrence_override_at", new Date(now.getTime() - MOVE_LOOKAHEAD_MS).toISOString())
                .lte("recurrence_override_at", new Date(lookAheadEnd.getTime() + MOVE_LOOKAHEAD_MS).toISOString()) as never,
          );
          for (const e of ovRes.errors)
            console.error("task-sweep reminder: overrides chunk failed; skipping its masters", e);
          remFailedMasters = ovRes.failedIds;
          overrides = ovRes.rows;
        }
        const candidates: SweepOccurrence[] = [];

        for (const p of (plainRows ?? []) as ReminderRow[]) {
          if (!p.reminder_minutes) continue;
          candidates.push({
            master_id: p.id,
            occurrence_at: p.starts_at,
            occurrence_ms: new Date(p.starts_at).getTime(),
            family_id: p.family_id,
            title: p.title,
            kind: null,
            late_after_minutes: 0,
            missed_after_minutes: 15,
            notify_start: true,
            reminder_minutes: p.reminder_minutes,
          });
        }

        for (const m of masters) {
          if (!m.reminder_minutes || !m.recurrence_freq) continue;
          if (remFailedMasters.has(m.id)) continue;
          candidates.push(
            ...expandMasterForSweep(m, overrides, now.getTime(), lookAheadEnd.getTime(), infoFor(m.family_id).tz),
          );
        }

        for (const c of candidates) {
          if (infoFor(c.family_id).tasksPaused) continue;
          if (!isReminderDue(c, now.getTime(), false)) continue;
          if (
            !isReminderDue(c, now.getTime(), await hasCompletion(supabaseAdmin, c.master_id, c.occurrence_at))
          )
            continue;

          // Per-occurrence dedupe via insert-if-absent.
          const ins = await supabaseAdmin
            .from("appointment_notifications")
            .insert({
              appointment_id: c.master_id,
              occurrence_at: c.occurrence_at,
              pass: "reminder",
            } as never)
            .select("appointment_id");
          if (ins.error) {
            if (ins.error.code !== "23505")
              console.error("task-sweep reminder: dedupe insert failed", ins.error.message);
            continue; // conflict (already sent) → skip silently
          }

          const { tz, lang } = infoFor(c.family_id);
          const time = formatTimeIn(new Date(c.occurrence_ms).toISOString(), tz);
          const nowDay = wallClockIn(now, tz).todayStr;
          const occDay = wallClockIn(new Date(c.occurrence_ms), tz).todayStr;
          const when = occDay === nowDay
            ? (lang === "sv" ? "idag" : "today")
            : (lang === "sv" ? "imorgon" : "tomorrow");
          const title = c.title || "Tillsa";
          const body =
            lang === "sv"
              ? `Påminnelse: ${title} · ${when} ${time}`
              : `Reminder: ${title} · ${when} ${time}`;
          await fanout(c.family_id, "reminder", {
            title,
            body,
            tag: `appt-${c.master_id}-reminder-${c.occurrence_at}`,
            url: "/dashboard",
          });
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
  const { data, error } = await client
    .from("appointment_completions")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("occurrence_at", occurrenceAt)
    .limit(1);
  if (error) {
    // Unknown state: report "completed" so this run doesn't push; the
    // dedupe row isn't claimed, so the next run retries.
    console.error("task-sweep: completion lookup failed", error.message);
    return true;
  }
  return Array.isArray(data) && data.length > 0;
}
