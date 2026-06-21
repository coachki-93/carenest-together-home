import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface CriticalAlert {
  family_id: string;
  scheduled_time: string; // "HH:MM:SS"
  /** Critical items that were answered "No" by the caregiver. */
  items: string[];
}

/**
 * Sends a Web Push to every subscription in the family when a caregiver
 * answers "No" on one or more critical Care Place Control questions.
 * Caller must be a member of the family (RLS-validated via has_membership).
 */
export const notifyCriticalNo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CriticalAlert) => data)
  .handler(async ({ data, context }) => {
    if (!data.items.length) return { ok: true, sent: 0 };

    // Authorize: caller must be a member of this family.
    const { data: memberRow, error: mErr } = await context.supabase
      .from("family_members")
      .select("user_id")
      .eq("family_id", data.family_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!memberRow) throw new Error("Not a family member");

    // Get caregiver display name for the message.
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();
    const who = profile?.full_name?.trim() || "Vårdgivare";

    // Privileged push fan-out.
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

    if (!subs || subs.length === 0) return { ok: true, sent: 0 };

    const slot = data.scheduled_time.slice(0, 5);
    const head = data.items.length === 1 ? data.items[0] : `${data.items.length} kritiska punkter`;
    const payload = JSON.stringify({
      title: "⚠️ Kritisk kontroll",
      body: `${who} rapporterade vid ${slot}: ${head}`,
      tag: `critical-${data.family_id}-${slot}`,
      url: "/dashboard",
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
