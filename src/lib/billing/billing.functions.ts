// Thin server-fn wrapper. Module scope must contain ONLY imports, types,
// and createServerFn declarations (see tanstack-serverfn-splitting card).
// Every runtime helper lives in stripe.server.ts and is dynamically
// imported inside handlers.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { hasProtectedSubscription } from "./subscription-state";
import { isMissingCustomer } from "./billing-errors";

/**
 * Read the caller's family subscription row. Any family member can call
 * this — RLS scopes the SELECT to their own family via the
 * `family_subscriptions_select_members` policy.
 */
export const getFamilySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { familyId: string }) =>
    z.object({ familyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("family_subscriptions")
      .select(
        "status, plan, trial_ends_at, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id",
      )
      .eq("family_id", data.familyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/**
 * Create a Stripe Checkout session for the family owner to start a
 * subscription. Owner-gate runs via the caller's RLS-scoped client
 * BEFORE any Stripe call or supabaseAdmin escalation.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    familyId: string;
    successUrl: string;
    cancelUrl: string;
  }) =>
    z
      .object({
        familyId: z.string().uuid(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // ---- 1. Owner gate via caller's RLS client (NO admin yet) ----------
    const { data: fam, error: famErr } = await supabase
      .from("families")
      .select("id, owner_id, name, founding_member")
      .eq("id", data.familyId)
      .maybeSingle();
    if (famErr) throw new Error(famErr.message);
    if (!fam) throw new Error("Family not found");
    if (fam.owner_id !== userId) {
      throw new Error("Only the family owner can manage billing");
    }

    // ---- 2. Look up existing subscription row (also RLS-scoped) --------
    const { data: existing, error: subErr } = await supabase
      .from("family_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status, plan, trial_ends_at, current_period_end, cancel_at_period_end")
      .eq("family_id", data.familyId)
      .maybeSingle();
    if (subErr) throw new Error("billing_failed");

    // ---- 3. Escalate — Stripe + admin writes -------------------------
    const { getStripeClient, resolvePriceId } = await import(
      "@/lib/billing/stripe.server"
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const stripe = getStripeClient();

    // Validate the stored customer before checkout. Missing protected accounts
    // must refuse recovery, not silently create a second paid subscription.
    let missingCustomer = false;
    if (existing?.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(existing.stripe_customer_id);
        missingCustomer = customer.deleted === true;
      } catch (error) {
        if (!isMissingCustomer(error, true)) throw new Error("billing_failed");
        missingCustomer = true;
      }
    }
    if (hasProtectedSubscription(existing)) {
      if (missingCustomer) {
        console.error("[billing] missing customer: recovery refused", {
          familyId: fam.id, mode: "checkout",
        });
        throw new Error("customer_not_found");
      }
      throw new Error("subscription_exists");
    }

    // Reuse a stored customer or create a fresh one. Store immediately so
    // future portal sessions and webhook lookups find it.
    let customerId = missingCustomer ? null : existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: fam.name,
        metadata: { family_id: fam.id, owner_user_id: userId },
      });
      customerId = customer.id;
      if (missingCustomer) {
        console.error("[billing] customer self-heal", {
          familyId: fam.id, oldCustomerId: existing?.stripe_customer_id, newCustomerId: customerId,
        });
      }
      const { error: upErr } = await supabaseAdmin
        .from("family_subscriptions")
        .update({ stripe_customer_id: customerId, ...(missingCustomer ? { stripe_subscription_id: null, status: "canceled" as const } : {}) })
        .eq("family_id", fam.id);
      if (upErr) throw new Error(`Failed to persist customer id: ${upErr.message}`);
    }

    const priceId = resolvePriceId(fam.founding_member);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      // family_id in BOTH the session and the subscription so every
      // downstream event (checkout.session.completed AND
      // customer.subscription.*) can look up the family without extra
      // round-trips.
      metadata: { family_id: fam.id },
      subscription_data: {
        metadata: {
          family_id: fam.id,
          plan: fam.founding_member ? "founding" : "standard",
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  });

/**
 * Create a Stripe Customer Portal session so the owner can manage card,
 * cancel, resume, and view invoices. Owner-gate runs first, same pattern.
 */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { familyId: string; returnUrl: string }) =>
    z
      .object({
        familyId: z.string().uuid(),
        returnUrl: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // ---- 1. Owner gate via caller's RLS client -----------------------
    const { data: fam, error: famErr } = await supabase
      .from("families")
      .select("id, owner_id")
      .eq("id", data.familyId)
      .maybeSingle();
    if (famErr) throw new Error(famErr.message);
    if (!fam) throw new Error("Family not found");
    if (fam.owner_id !== userId) {
      throw new Error("Only the family owner can manage billing");
    }

    // ---- 2. Fetch the stored customer id (RLS-scoped) ----------------
    const { data: sub, error: subErr } = await supabase
      .from("family_subscriptions")
      .select("stripe_customer_id")
      .eq("family_id", data.familyId)
      .maybeSingle();
    if (subErr) throw new Error("billing_failed");
    if (!sub?.stripe_customer_id) {
      throw new Error("customer_not_found");
    }

    // ---- 3. Escalate — Stripe only, no DB writes needed --------------
    const { getStripeClient } = await import("@/lib/billing/stripe.server");
    const stripe = getStripeClient();
    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      if (isMissingCustomer(error)) {
        console.error("[billing] portal customer missing", { familyId: fam.id, mode: "portal" });
        throw new Error("customer_not_found");
      }
      throw new Error("billing_failed");
    }
  });
