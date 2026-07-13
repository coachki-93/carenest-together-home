import { createFileRoute } from "@tanstack/react-router";
import { formatTimeIn, wallClockIn } from "@/lib/time/family-tz";
import { authorizeCronRequest } from "@/lib/push/cron-auth";
import { VAPID_PUBLIC_KEY } from "@/lib/push/keys";

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
        };

        const slmSelect =
          "id, family_id, title, kind, starts_at, all_day, late_after_minutes, missed_after_minutes, recurrence_freq, recurrence_interval, recurrence_byweekday, recurrence_times_of_day, recurrence_parent_id, recurrence_override_at, recurrence_cancelled";

        // Non-recurring, non-override rows whose single occurrence lands in
        // the window.
        const { data: slmPlainRows } = await supabaseAdmin
          .from("appointments")
          .select(slmSelect)
          .is("recurrence_freq", null)
          .is("recurrence_parent_id", null)
          .eq("all_day", false)
          .gte("starts_at", windowStartIso)
          .lte("starts_at", nowIso)
          .limit(1000);

        // All recurring masters (infinite series — no time filter).
        const { data: slmMasterRows } = await supabaseAdmin
          .from("appointments")
          .select(slmSelect)
          .not("recurrence_freq", "is", null)
          .eq("all_day", false)
          .limit(1000);

        const slmMasters = (slmMasterRows ?? []) as SLMRow[];

        // Overrides for those masters within the window. Non-cancelled
        // overrides *replace* the master's occurrence at that timestamp
        // (own title / starts_at / thresholds); cancelled overrides drop it.
        type SLMOverride = SLMRow & {
          recurrence_parent_id: string;
          recurrence_override_at: string;
        };
        let slmOverrides: SLMOverride[] = [];
        if (slmMasters.length > 0) {
          const { data: ov } = await supabaseAdmin
            .from("appointments")
            .select(slmSelect)
            .in(
              "recurrence_parent_id",
              slmMasters.map((m) => m.id),
            )
            .gte("recurrence_override_at", windowStartIso)
            .lte("recurrence_override_at", nowIso);
          slmOverrides = ((ov ?? []) as unknown as SLMRow[]).filter(
            (r): r is SLMOverride =>
              !!r.recurrence_parent_id && !!r.recurrence_override_at,
          );
        }
        const slmCancelled = new Set<string>();
        const slmOverrideByKey = new Map<string, SLMOverride>();
        for (const o of slmOverrides) {
          const key = `${o.recurrence_parent_id}@${new Date(o.recurrence_override_at).toISOString()}`;
          if (o.recurrence_cancelled) slmCancelled.add(key);
          else slmOverrideByKey.set(key, o);
        }

        type SLMCandidate = {
          master_id: string;
          occurrence_at: string; // ISO
          occurrence_ms: number;
          family_id: string;
          title: string | null;
          kind: string | null;
          late_after_minutes: number;
          missed_after_minutes: number;
        };

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
          });
        }

        for (const m of slmMasters) {
          const occs = expandOccurrences(m, windowStart, now);
          for (const occ of occs) {
            const iso = occ.toISOString();
            const key = `${m.id}@${iso}`;
            if (slmCancelled.has(key)) continue;
            const ov = slmOverrideByKey.get(key);
            const src = ov ?? m;
            slmCandidates.push({
              master_id: m.id,
              occurrence_at: ov ? ov.recurrence_override_at : iso,
              occurrence_ms: new Date(
                ov ? ov.recurrence_override_at : iso,
              ).getTime(),
              family_id: m.family_id,
              title: src.title,
              kind: src.kind,
              late_after_minutes: src.late_after_minutes ?? m.late_after_minutes ?? 0,
              missed_after_minutes:
                src.missed_after_minutes ?? m.missed_after_minutes ?? 15,
            });
          }
        }

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
          return !error;
        };

        // -------- PASS 1: start (within START_GRACE_MINUTES) --------
        for (const c of slmCandidates) {
          const diffMin = (now.getTime() - c.occurrence_ms) / 60_000;
          if (diffMin < 0 || diffMin > START_GRACE_MINUTES) continue;
          if (!(await tryClaim(c.master_id, c.occurrence_at, "start"))) continue;

          const { tz, lang } = infoFor(c.family_id);
          await fanout(c.family_id, {
            title: c.title || "CareNest",
            body: `${humanKind(c.kind, lang)} • ${formatTimeIn(c.occurrence_at, tz)}`,
            tag: `appt-${c.master_id}-start-${c.occurrence_at}`,
            url: "/dashboard",
          });
        }

        // -------- PASS 2: late --------
        for (const c of slmCandidates) {
          const dueMs = c.occurrence_ms + c.late_after_minutes * 60_000;
          if (now.getTime() < dueMs) continue;
          if (await hasCompletion(supabaseAdmin, c.master_id, c.occurrence_at))
            continue;
          if (!(await tryClaim(c.master_id, c.occurrence_at, "late"))) continue;

          const { tz, lang } = infoFor(c.family_id);
          const title = c.title || "CareNest";
          await fanout(c.family_id, {
            title: COPY[lang].lateTitle(title),
            body: COPY[lang].lateBody(formatTimeIn(c.occurrence_at, tz)),
            tag: `appt-${c.master_id}-late-${c.occurrence_at}`,
            url: "/dashboard",
          });
        }

        // -------- PASS 3: missed --------
        for (const c of slmCandidates) {
          const dueMs = c.occurrence_ms + c.missed_after_minutes * 60_000;
          if (now.getTime() < dueMs) continue;
          if (await hasCompletion(supabaseAdmin, c.master_id, c.occurrence_at))
            continue;
          if (!(await tryClaim(c.master_id, c.occurrence_at, "missed"))) continue;

          const { tz, lang } = infoFor(c.family_id);
          const title = c.title || "CareNest";
          await fanout(c.family_id, {
            title: COPY[lang].missedTitle(title),
            body: COPY[lang].missedBody(formatTimeIn(c.occurrence_at, tz)),
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
        const { data: plainRows } = await supabaseAdmin
          .from("appointments")
          .select(
            "id, family_id, title, starts_at, reminder_minutes, recurrence_freq, recurrence_interval, recurrence_byweekday, recurrence_times_of_day, ends_at, all_day",
          )
          .not("reminder_minutes", "is", null)
          .is("recurrence_freq", null)
          .is("recurrence_parent_id", null)
          .eq("all_day", false)
          .gte("starts_at", nowIso)
          .lte("starts_at", lookAheadIso)
          .limit(500);

        // Recurring masters with reminders
        const { data: masterRows } = await supabaseAdmin
          .from("appointments")
          .select(
            "id, family_id, title, starts_at, reminder_minutes, recurrence_freq, recurrence_interval, recurrence_byweekday, recurrence_times_of_day, ends_at, all_day",
          )
          .not("reminder_minutes", "is", null)
          .not("recurrence_freq", "is", null)
          .eq("all_day", false)
          .limit(500);

        // Load overrides for these masters within window (for cancel detection)
        const masters = (masterRows ?? []) as ReminderRow[];
        type Override = {
          recurrence_parent_id: string;
          recurrence_override_at: string;
          recurrence_cancelled: boolean;
        };
        let overrides: Override[] = [];
        if (masters.length > 0) {
          const { data: ov } = await supabaseAdmin
            .from("appointments")
            .select(
              "recurrence_parent_id, recurrence_override_at, recurrence_cancelled",
            )
            .in(
              "recurrence_parent_id",
              masters.map((m) => m.id),
            )
            .gte("recurrence_override_at", nowIso)
            .lte("recurrence_override_at", lookAheadIso);
          overrides = (ov ?? []) as Override[];
        }
        const overrideKey = new Set<string>();
        for (const o of overrides) {
          if (o.recurrence_cancelled) {
            overrideKey.add(
              `${o.recurrence_parent_id}@${new Date(o.recurrence_override_at).toISOString()}`,
            );
          }
        }

        type Candidate = {
          master_id: string;
          occurrence_at: string;
          family_id: string;
          title: string | null;
          reminder_minutes: number;
          starts_at_ms: number;
        };
        const candidates: Candidate[] = [];

        for (const p of (plainRows ?? []) as ReminderRow[]) {
          if (!p.reminder_minutes) continue;
          candidates.push({
            master_id: p.id,
            occurrence_at: p.starts_at,
            family_id: p.family_id,
            title: p.title,
            reminder_minutes: p.reminder_minutes,
            starts_at_ms: new Date(p.starts_at).getTime(),
          });
        }

        for (const m of masters) {
          if (!m.reminder_minutes || !m.recurrence_freq) continue;
          const occs = expandOccurrences(m, now, lookAheadEnd);
          for (const occ of occs) {
            const iso = occ.toISOString();
            if (overrideKey.has(`${m.id}@${iso}`)) continue;
            candidates.push({
              master_id: m.id,
              occurrence_at: iso,
              family_id: m.family_id,
              title: m.title,
              reminder_minutes: m.reminder_minutes,
              starts_at_ms: occ.getTime(),
            });
          }
        }

        for (const c of candidates) {
          const remindAtMs = c.starts_at_ms - c.reminder_minutes * 60_000;
          if (now.getTime() < remindAtMs) continue;
          if (now.getTime() >= c.starts_at_ms) continue;
          if (await hasCompletion(supabaseAdmin, c.master_id, c.occurrence_at))
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
          if (ins.error) continue; // conflict (already sent) → skip silently

          const { tz, lang } = infoFor(c.family_id);
          const time = formatTimeIn(c.occurrence_at, tz);
          const nowDay = wallClockIn(now, tz).todayStr;
          const occDay = wallClockIn(new Date(c.occurrence_at), tz).todayStr;
          const when = occDay === nowDay
            ? (lang === "sv" ? "idag" : "today")
            : (lang === "sv" ? "imorgon" : "tomorrow");
          const title = c.title || "CareNest";
          const body =
            lang === "sv"
              ? `Påminnelse: ${title} · ${when} ${time}`
              : `Reminder: ${title} · ${when} ${time}`;
          await fanout(c.family_id, {
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

// ---- Occurrence expander (server-safe port of expandMaster) ----
const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;
const EXPAND_CAP = 200;

function parseHHMM(s: string): [number, number] | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!(hh >= 0 && hh <= 23) || !(mm >= 0 && mm <= 59)) return null;
  return [hh, mm];
}

function expandOccurrences(
  master: {
    starts_at: string;
    recurrence_freq: string | null;
    recurrence_interval: number | null;
    recurrence_byweekday: number[] | null;
    recurrence_times_of_day: string[] | null;
  },
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const out: Date[] = [];
  const freq = master.recurrence_freq;
  if (!freq) return out;
  const interval = Math.max(1, master.recurrence_interval ?? 1);
  const start = new Date(master.starts_at);
  if (start >= rangeEnd) return out;

  const emit = (base: Date) => {
    const times: Array<[number, number]> = [];
    const list = (master.recurrence_times_of_day ?? [])
      .map(parseHHMM)
      .filter((x): x is [number, number] => !!x);
    if (list.length > 0) times.push(...list);
    else times.push([start.getUTCHours(), start.getUTCMinutes()]);
    for (const [hh, mm] of times) {
      const occ = new Date(
        Date.UTC(
          base.getUTCFullYear(),
          base.getUTCMonth(),
          base.getUTCDate(),
          hh,
          mm,
          0,
          0,
        ),
      );
      if (occ >= start && occ >= rangeStart && occ < rangeEnd) out.push(occ);
    }
  };

  if (freq === "hourly") {
    const stepMs = interval * MS_HOUR;
    let t = start.getTime();
    if (t < rangeStart.getTime()) {
      const skips = Math.ceil((rangeStart.getTime() - t) / stepMs);
      t = t + skips * stepMs;
    }
    let n = 0;
    while (t < rangeEnd.getTime() && n < EXPAND_CAP) {
      out.push(new Date(t));
      t += stepMs;
      n++;
    }
    return out;
  }

  if (freq === "daily") {
    const cursor = new Date(Math.max(start.getTime(), rangeStart.getTime()));
    cursor.setUTCHours(0, 0, 0, 0);
    const startDay = new Date(start);
    startDay.setUTCHours(0, 0, 0, 0);
    let n = 0;
    while (cursor < rangeEnd && n < EXPAND_CAP) {
      const diffDays = Math.round(
        (cursor.getTime() - startDay.getTime()) / MS_DAY,
      );
      if (diffDays >= 0 && diffDays % interval === 0) emit(cursor);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      n++;
    }
    return out;
  }

  if (freq === "weekly") {
    const weekdays = (master.recurrence_byweekday ?? []).filter(
      (w) => w >= 0 && w <= 6,
    );
    if (weekdays.length === 0) return out;
    const cursor = new Date(Math.max(start.getTime(), rangeStart.getTime()));
    cursor.setUTCHours(0, 0, 0, 0);
    let n = 0;
    while (cursor < rangeEnd && n < EXPAND_CAP * 7) {
      if (weekdays.includes(cursor.getUTCDay())) emit(cursor);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      n++;
    }
    return out;
  }

  if (freq === "monthly") {
    const dom = start.getUTCDate();
    let y = Math.max(start.getUTCFullYear(), rangeStart.getUTCFullYear());
    let mo =
      y === start.getUTCFullYear() ? start.getUTCMonth() : 0;
    if (y === rangeStart.getUTCFullYear() && mo < rangeStart.getUTCMonth()) {
      mo = rangeStart.getUTCMonth();
    }
    let n = 0;
    while (n < EXPAND_CAP) {
      const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      if (dom <= daysInMonth) {
        const totalMonths =
          (y - start.getUTCFullYear()) * 12 + (mo - start.getUTCMonth());
        if (totalMonths >= 0 && totalMonths % interval === 0) {
          emit(new Date(Date.UTC(y, mo, dom)));
        }
      }
      mo += 1;
      if (mo > 11) {
        mo = 0;
        y += 1;
      }
      const probe = new Date(Date.UTC(y, mo, Math.min(dom, 28)));
      if (probe >= rangeEnd) break;
      n++;
    }
    return out;
  }

  return out;
}


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
