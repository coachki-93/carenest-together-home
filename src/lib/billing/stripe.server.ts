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
