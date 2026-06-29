import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ageMonthsFromDob,
  getVitalRanges,
  parseRangeOverrides,
  type VitalType,
} from "@/lib/vitals/ranges";

interface StreakInput {
  family_id: string;
  child_id: string | null;
  vital_type: VitalType;
}

const STREAK_LENGTH = 3;
const TYPE_LABEL: Partial<Record<VitalType, string>> = {
  heart_rate: "Hjärtfrekvens",
  spo2: "SpO₂",
  temperature: "Temperatur",
  breathing: "Andningsfrekvens",
};

/**
 * Called after a vital is logged. Looks at the last STREAK_LENGTH readings of
 * the same vital_type for the same child; if every one is outside the
 * (age-adjusted, optionally custom) reference range, sends one push to the
 * whole family. Idempotent via a tag tied to the latest reading id.
 */
export const notifyVitalStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: StreakInput) => data)
  .handler(async ({ data, context }) => {
    if (!data.child_id) return { ok: true, sent: 0, reason: "no_child" };
    const label = TYPE_LABEL[data.vital_type];
    if (!label) return { ok: true, sent: 0, reason: "unsupported_type" };

    // Authorize
    const { data: member } = await context.supabase
      .from("family_members")
      .select("user_id")
      .eq("family_id", data.family_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!member) throw new Error("Not a family member");

    // Last N readings for this child + type
    const { data: rows } = await context.supabase
      .from("vitals")
      .select("id, value, logged_at")
      .eq("family_id", data.family_id)
      .eq("child_id", data.child_id)
      .eq("vital_type", data.vital_type)
      .order("logged_at", { ascending: false })
      .limit(STREAK_LENGTH);
    if (!rows || rows.length < STREAK_LENGTH) return { ok: true, sent: 0, reason: "not_enough" };

    // Child range info
    const { data: child } = await context.supabase
      .from("children")
      .select("date_of_birth, custom_vital_ranges")
      .eq("id", data.child_id)
      .maybeSingle();
    const ageMonths = ageMonthsFromDob(child?.date_of_birth ?? null);
    const overrides = parseRangeOverrides(child?.custom_vital_ranges);
    const ranges = getVitalRanges(ageMonths, overrides);
    const range = ranges[data.vital_type];
    if (!range) return { ok: true, sent: 0, reason: "no_range" };

    const allOut = rows.every((r) => {
      const v = Number(r.value);
      return Number.isFinite(v) && (v < range.low || v > range.high);
    });
    if (!allOut) return { ok: true, sent: 0, reason: "in_range" };

    const direction = Number(rows[0].value) < range.low ? "lågt" : "högt";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const webpush = (await import("web-push")).default;

    const vapidPublic =
      "BKhqzimlxSXKmf1FK9n0jaINDW5QKsWBwQBD_LZYhpE2GPPdLIDPQAQz2oo4UNQP0riQtptO71Mu2zU5cvoyP38";
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@carenest.app";
    if (!vapidPrivate) return { ok: false, sent: 0, error: "Missing VAPID_PRIVATE_KEY" };
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("family_id", data.family_id);
    if (!subs?.length) return { ok: true, sent: 0 };

    const latestVal = Number(rows[0].value);
    const payload = JSON.stringify({
      title: `⚠️ ${label} ${direction}`,
      body: `${STREAK_LENGTH} mätningar i rad utanför normalområdet (senaste: ${latestVal}).`,
      tag: `vital-streak-${data.child_id}-${data.vital_type}-${rows[0].id}`,
      url: "/vitals",
    });

    let sent = 0;
    const stale: string[] = [];
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
    if (stale.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
    }
    return { ok: true, sent };
  });
