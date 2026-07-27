// Server-only Stripe helpers. NEVER import from a *.functions.ts file at
// module scope — always dynamically import inside the handler.
import Stripe from "stripe";

/**
 * Build a Stripe client configured for the Cloudflare Worker runtime.
 * Uses the fetch-based HTTP client (workerd has no Node net/tls) and pins
 * an explicit apiVersion so behavior doesn't shift under our feet.
 */
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, {
    apiVersion: "2026-06-24.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Resolve the Stripe price ID for a family based on its founding_member flag.
 * 199 kr/mo for founding members, 299 kr/mo for standard. Both are configured
 * per-environment via secrets so preview/live can point at test/live prices.
 */
export function resolvePriceId(founding: boolean): string {
  const founding_price = process.env.STRIPE_PRICE_FOUNDING;
  const standard_price = process.env.STRIPE_PRICE_STANDARD;
  const chosen = founding ? founding_price : standard_price;
  if (!chosen) {
    throw new Error(
      `Missing Stripe price secret: ${founding ? "STRIPE_PRICE_FOUNDING" : "STRIPE_PRICE_STANDARD"}`,
    );
  }
  return chosen;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return secret;
}

/**
 * Map a Stripe subscription's status to our `subscription_status` enum.
 * Stripe emits: incomplete, incomplete_expired, trialing, active, past_due,
 * canceled, unpaid, paused. We collapse to our five-value enum.
 */
export function mapStripeStatus(
  s: Stripe.Subscription.Status,
): "trialing" | "active" | "past_due" | "canceled" | "none" {
  switch (s) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      // incomplete / paused → treat as none until resolved.
      return "none";
  }
}

/**
 * Extract current_period_end from a Subscription across API-version drift.
 * Newer API versions moved this field onto subscription items; we fall
 * back through the known locations and return ISO or null.
 */
export function subscriptionPeriodEndIso(sub: unknown): string | null {
  const s = sub as {
    current_period_end?: number | null;
    items?: { data?: Array<{ current_period_end?: number | null }> };
  };
  const seconds =
    s?.current_period_end ??
    s?.items?.data?.[0]?.current_period_end ??
    null;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * Extract the subscription id from an Invoice across API-version drift.
 * Old shape: invoice.subscription. New shape: invoice.parent
 * .subscription_details.subscription. Returns the id or null.
 */
export function invoiceSubscriptionId(invoice: unknown): string | null {
  const i = invoice as {
    subscription?: string | { id?: string } | null;
    parent?: {
      subscription_details?: {
        subscription?: string | { id?: string } | null;
      };
    };
  };
  const candidate =
    i?.subscription ?? i?.parent?.subscription_details?.subscription ?? null;
  if (!candidate) return null;
  return typeof candidate === "string" ? candidate : candidate.id ?? null;
}
