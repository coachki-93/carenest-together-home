import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe webhook — the ONLY writer of subscription state.
 *
 * Security invariants (do not break):
 *  1. Read RAW body via request.text() BEFORE any JSON.parse. Signature
 *     verification requires the exact bytes Stripe signed.
 *  2. Verify the signature via constructEventAsync (Workers use
 *     SubtleCrypto — the sync constructEvent will throw). Return 400 on
 *     any mismatch BEFORE any DB write.
 *  3. Insert into stripe_webhook_events (idempotency ledger) BEFORE
 *     processing. ON CONFLICT DO NOTHING → if the row already existed,
 *     we already processed this event id; return 200 and skip.
 *  4. All subscription state is written via supabaseAdmin. RLS forbids
 *     authenticated writes on family_subscriptions, so no signed-in
 *     client can forge status='active'.
 *
 * Deployment: Stripe → Developers → Webhooks → point at
 *   https://<project>--<id>.lovable.app/api/public/hooks/stripe
 * and paste the endpoint's signing secret into STRIPE_WEBHOOK_SECRET.
 */
export const Route = createFileRoute("/api/public/hooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ---- 1. RAW body (must precede any parsing) --------------------
        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response("Missing stripe-signature header", { status: 400 });
        }
        const rawBody = await request.text();

        // ---- 2. Signature verification --------------------------------
        // Dynamic imports keep server-only modules out of any client graph.
        const { getStripeClient, getWebhookSecret, mapStripeStatus } =
          await import("@/lib/billing/stripe.server");

        const stripe = getStripeClient();
        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            getWebhookSecret(),
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown";
          console.error("[stripe webhook] signature verification failed:", msg);
          return new Response("Invalid signature", { status: 400 });
        }

        // Only escalate to admin AFTER signature is verified.
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // ---- 3. Idempotency: record BEFORE processing -----------------
        const { error: ledgerErr, count } = await supabaseAdmin
          .from("stripe_webhook_events")
          .insert(
            { event_id: event.id, event_type: event.type },
            { count: "exact" },
          )
          .select("event_id", { count: "exact", head: true });

        // The PostgREST client returns a unique-violation error (code 23505)
        // when the event_id already exists. Treat that as "already processed"
        // and return 200 so Stripe stops retrying.
        if (ledgerErr) {
          const isDuplicate =
            "code" in ledgerErr && (ledgerErr as { code?: string }).code === "23505";
          if (isDuplicate) {
            return new Response("Already processed", { status: 200 });
          }
          console.error("[stripe webhook] ledger insert failed:", ledgerErr.message);
          return new Response("Ledger write failed", { status: 500 });
        }
        void count;

        // ---- 4. Process event (admin-only writes) ---------------------
        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as import("stripe").Stripe.Checkout.Session;
              const familyId = session.metadata?.family_id ?? null;
              const subscriptionId =
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription?.id ?? null;
              const customerId =
                typeof session.customer === "string"
                  ? session.customer
                  : session.customer?.id ?? null;

              if (familyId && subscriptionId) {
                // Fetch the subscription for authoritative status/period.
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const plan =
                  (sub.metadata?.plan === "standard" ? "standard" : "founding") as
                    | "founding"
                    | "standard";
                await supabaseAdmin
                  .from("family_subscriptions")
                  .update({
                    stripe_customer_id: customerId,
                    stripe_subscription_id: sub.id,
                    status: mapStripeStatus(sub.status),
                    plan,
                    current_period_end: new Date(
                      sub.current_period_end * 1000,
                    ).toISOString(),
                    cancel_at_period_end: sub.cancel_at_period_end,
                  })
                  .eq("family_id", familyId);
              }
              break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object as import("stripe").Stripe.Subscription;
              const familyId = sub.metadata?.family_id ?? null;
              if (familyId) {
                const plan =
                  (sub.metadata?.plan === "standard" ? "standard" : "founding") as
                    | "founding"
                    | "standard";
                await supabaseAdmin
                  .from("family_subscriptions")
                  .update({
                    stripe_subscription_id: sub.id,
                    status: mapStripeStatus(sub.status),
                    plan,
                    current_period_end: new Date(
                      sub.current_period_end * 1000,
                    ).toISOString(),
                    cancel_at_period_end: sub.cancel_at_period_end,
                  })
                  .eq("family_id", familyId);
              }
              break;
            }

            case "invoice.payment_failed": {
              // Stripe will also emit customer.subscription.updated → past_due,
              // but we mirror explicitly to avoid depending on event order.
              const invoice = event.data.object as import("stripe").Stripe.Invoice;
              const subscriptionId =
                typeof invoice.subscription === "string"
                  ? invoice.subscription
                  : invoice.subscription?.id ?? null;
              if (subscriptionId) {
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const familyId = sub.metadata?.family_id ?? null;
                if (familyId) {
                  await supabaseAdmin
                    .from("family_subscriptions")
                    .update({
                      status: mapStripeStatus(sub.status),
                      current_period_end: new Date(
                        sub.current_period_end * 1000,
                      ).toISOString(),
                    })
                    .eq("family_id", familyId);
                }
              }
              break;
            }

            default:
              // Ignore other event types — the ledger row already commits,
              // so Stripe won't retry.
              break;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown";
          console.error(`[stripe webhook] handler ${event.type} failed:`, msg);
          // Return 500 so Stripe retries. The ledger row will still exist,
          // but the retry will hit the duplicate-key path and 200 out —
          // which means a handler failure is NOT auto-retried. Trade-off:
          // predictable no-double-processing over automatic recovery.
          // Alerting on this log line covers the recovery gap.
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
