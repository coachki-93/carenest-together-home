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
 *     processing. Unique-violation → we already processed this event;
 *     return 200 and skip.
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
        const {
          getStripeClient,
          getWebhookSecret,
          mapStripeStatus,
          subscriptionPeriodEndIso,
          invoiceSubscriptionId,
        } = await import("@/lib/billing/stripe.server");

        const stripe = getStripeClient();
        let event: import("stripe").Stripe.Event;
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
        const { error: ledgerErr } = await supabaseAdmin
          .from("stripe_webhook_events")
          .insert({ event_id: event.id, event_type: event.type });

        if (ledgerErr) {
          // 23505 = unique_violation → this event was already processed.
          const code = (ledgerErr as { code?: string }).code;
          if (code === "23505") {
            return new Response("Already processed", { status: 200 });
          }
          console.error("[stripe webhook] ledger insert failed:", ledgerErr.message);
          return new Response("Ledger write failed", { status: 500 });
        }

        // Type alias for a subscription row update payload.
        type SubUpdate = {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: "trialing" | "active" | "past_due" | "canceled" | "none";
          plan?: "founding" | "standard";
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };

        // ---- 4. Process event (admin-only writes) ---------------------
        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object;
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
                const sub = (await stripe.subscriptions.retrieve(
                  subscriptionId,
                )) as unknown as import("stripe").Stripe.Subscription;
                const plan: "founding" | "standard" =
                  sub.metadata?.plan === "standard" ? "standard" : "founding";
                const update: SubUpdate = {
                  stripe_customer_id: customerId,
                  stripe_subscription_id: sub.id,
                  status: mapStripeStatus(sub.status),
                  plan,
                  current_period_end: subscriptionPeriodEndIso(sub),
                  cancel_at_period_end: sub.cancel_at_period_end,
                };
                await supabaseAdmin
                  .from("family_subscriptions")
                  .update(update)
                  .eq("family_id", familyId);
              }
              break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object;
              // Portal-initiated events carry no metadata, so fall back to
              // resolving the family by the Stripe subscription id.
              let familyId = sub.metadata?.family_id ?? null;
              if (!familyId) {
                const { data: existing, error: lookupErr } = await supabaseAdmin
                  .from("family_subscriptions")
                  .select("family_id")
                  .eq("stripe_subscription_id", sub.id)
                  .maybeSingle();
                if (lookupErr) {
                  console.error(
                    `[stripe webhook] family lookup failed for event ${event.id} sub ${sub.id}:`,
                    lookupErr.message,
                  );
                }
                familyId = existing?.family_id ?? null;
              }
              if (familyId) {
                const update: SubUpdate = {
                  stripe_subscription_id: sub.id,
                  status: mapStripeStatus(sub.status),
                  current_period_end: subscriptionPeriodEndIso(sub),
                  cancel_at_period_end: sub.cancel_at_period_end,
                };
                // Only overwrite plan when the event actually carries one —
                // portal events must not relabel a standard family as founding.
                if (sub.metadata?.plan) {
                  update.plan =
                    sub.metadata.plan === "standard" ? "standard" : "founding";
                }
                await supabaseAdmin
                  .from("family_subscriptions")
                  .update(update)
                  .eq("family_id", familyId);
              } else {
                console.error(
                  `[stripe webhook] ${event.type}: no family for event ${event.id} subscription ${sub.id}`,
                );
              }
              break;
            }

            case "invoice.payment_failed": {
              // Stripe also emits customer.subscription.updated → past_due,
              // but we mirror explicitly so ordering doesn't matter.
              const invoice = event.data.object;
              const subscriptionId = invoiceSubscriptionId(invoice);
              if (subscriptionId) {
                const sub = (await stripe.subscriptions.retrieve(
                  subscriptionId,
                )) as unknown as import("stripe").Stripe.Subscription;
                const familyId = sub.metadata?.family_id ?? null;
                if (familyId) {
                  const update: SubUpdate = {
                    status: mapStripeStatus(sub.status),
                    current_period_end: subscriptionPeriodEndIso(sub),
                  };
                  await supabaseAdmin
                    .from("family_subscriptions")
                    .update(update)
                    .eq("family_id", familyId);
                }
              }
              break;
            }

            default:
              // Unhandled event types still record in the ledger so Stripe
              // stops retrying them.
              break;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown";
          console.error(`[stripe webhook] handler ${event.type} failed:`, msg);
          // Return 500 → Stripe retries. The ledger row already exists, so
          // the retry hits the duplicate-key path and 200s — meaning a
          // handler failure is NOT auto-retried. Deliberate trade-off:
          // predictable no-double-processing over automatic recovery.
          // Alert on this log line to close the recovery gap.
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
