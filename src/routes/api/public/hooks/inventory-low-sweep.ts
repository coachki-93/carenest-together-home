import { createFileRoute } from "@tanstack/react-router";
import { authorizeCronRequest } from "@/lib/push/cron-auth";
import { VAPID_PUBLIC_KEY } from "@/lib/push/keys";
import { createRecipientResolver } from "@/lib/push/recipients";

/**
 * Sweeps every active inventory item and pushes one "low stock" notification
 * per item that has crossed its `low_stock_threshold`. The stamp
 * `low_stock_alert_sent_at` dedupes; a `BEFORE UPDATE` trigger on
 * `inventory_items.quantity` clears the stamp when the item is restocked
 * back above the threshold, so a subsequent drop re-arms the alert.
 *
 * Recipients (via shared resolver, category = "stock"): owners + any member
 * with `material_responsible = true`, regardless of `owner_notify_level`.
 *
 * Triggered hourly by pg_cron with the project's `apikey` header.
 */
export const Route = createFileRoute("/api/public/hooks/inventory-low-sweep")({
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

        // Items that are active, have a threshold set, at/below it, and have
        // not already been alerted since the last recovery.
        const { data: items } = await supabaseAdmin
          .from("inventory_items")
          .select(
            "id, family_id, name, quantity, low_stock_threshold, low_stock_alert_sent_at",
          )
          .eq("active", true)
          .not("low_stock_threshold", "is", null)
          .is("low_stock_alert_sent_at", null)
          .limit(2000);

        if (!items?.length) return Response.json({ ok: true, pushes: 0, items: 0 });

        // Per-family language for the copy.
        const familyIds = Array.from(new Set(items.map((i) => i.family_id)));
        const { data: fams } = await supabaseAdmin
          .from("families")
          .select("id, notification_language")
          .in("id", familyIds);
        const langOf = new Map<string, "sv" | "en">(
          (fams ?? []).map((f) => [
            f.id,
            (f.notification_language === "en" ? "en" : "sv") as "sv" | "en",
          ]),
        );

        const COPY = {
          sv: {
            title: "Låg nivå i förrådet",
            body: (name: string, qty: number, thr: number) =>
              `${name}: ${qty} kvar (gräns ${thr}). Dags att fylla på.`,
          },
          en: {
            title: "Inventory running low",
            body: (name: string, qty: number, thr: number) =>
              `${name}: ${qty} left (threshold ${thr}). Time to restock.`,
          },
        } as const;

        const recipients = createRecipientResolver(supabaseAdmin);
        let pushes = 0;
        const stale: string[] = [];
        const nowIso = new Date().toISOString();

        for (const it of items) {
          const thr = it.low_stock_threshold ?? 0;
          if (it.quantity > thr) continue;

          const lang = langOf.get(it.family_id) ?? "sv";
          const copy = COPY[lang];

          if (vapidPrivate) {
            const subs = await recipients.getRecipients(it.family_id, "stock");
            if (subs.length) {
              const payload = JSON.stringify({
                title: copy.title,
                body: copy.body(it.name, it.quantity, thr),
                tag: `stock-low-${it.id}`,
                url: "/inventory",
              });
              await Promise.allSettled(
                subs.map(async (s) => {
                  try {
                    await webpush.sendNotification(
                      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                      payload,
                      { TTL: 6 * 60 * 60 },
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

          await supabaseAdmin
            .from("inventory_items")
            .update({ low_stock_alert_sent_at: nowIso })
            .eq("id", it.id);
        }

        if (stale.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
        }

        return Response.json({ ok: true, pushes, items: items.length });
      },
    },
  },
});
