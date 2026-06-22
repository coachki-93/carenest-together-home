import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface OngoingAlert {
  family_id: string;
  title: string;
  /** Used as the deduping push `tag`. */
  task_key: string;
  /** Where the notification should deep-link. */
  url?: string;
}

/**
 * Sent when a caregiver taps "Ongoing" on a long-running task.
 * Notifies every family member EXCEPT the actor's own subscriptions.
 */
export const notifyOngoing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: OngoingAlert) => data)
  .handler(async ({ data, context }) => {
    // Authorize: caller must be a member of this family.
    const { data: memberRow, error: mErr } = await context.supabase
      .from("family_members")
      .select("user_id")
      .eq("family_id", data.family_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!memberRow) throw new Error("Not a family member");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();
    const who = profile?.full_name?.trim() || "A caregiver";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const webpush = (await import("web-push")).default;

    const vapidPublic =
      "BKhqzimlxSXKmf1FK9n0jaINDW5QKsWBwQBD_LZYhpE2GPPdLIDPQAQz2oo4UNQP0riQtptO71Mu2zU5cvoyP38";
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@carenest.app";
    if (!vapidPrivate) return { ok: false, sent: 0, error: "Missing VAPID_PRIVATE_KEY" };
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    // Everyone in the family EXCEPT the actor.
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("family_id", data.family_id)
      .neq("user_id", context.userId);

    if (!subs || subs.length === 0) return { ok: true, sent: 0 };

    const payload = JSON.stringify({
      title: `▶ ${data.title || "Task"}`,
      body: `${who} started this task`,
      tag: `ongoing-${data.task_key}`,
      url: data.url ?? "/dashboard",
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
