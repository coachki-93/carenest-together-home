import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { billingPresentation, billingStatus, checkoutPlan, deriveState, hasLiveSubscription, hasProtectedSubscription, isFoundingAt, type SubscriptionRow } from "./subscription-state";
import { resolvePriceId } from "./stripe.server";
import { billingErrorKey, isMissingCustomer } from "./billing-errors";

const row = (overrides: Partial<NonNullable<SubscriptionRow>> = {}): NonNullable<SubscriptionRow> => ({
  status: "active", plan: "founding", trial_ends_at: null,
  current_period_end: "2026-11-30T00:00:00Z", cancel_at_period_end: false,
  stripe_customer_id: "cus_missing", stripe_subscription_id: "sub_existing", ...overrides,
});

describe("billing recovery and shared derived state", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-30T23:42:00Z")); });
  afterEach(() => vi.useRealTimers());
  it.each([
    ["abandoned checkout", { status: "none", stripe_subscription_id: null }, "subscribe", true],
    ["cancelled", { status: "canceled" }, "subscribe", true],
    ["trialing without customer", { status: "trialing", trial_ends_at: "2026-11-10T00:00:00Z", stripe_subscription_id: null, stripe_customer_id: null }, "subscribe", false],
    ["active", {}, "manage", false],
    ["cancel-scheduled", { cancel_at_period_end: true }, "manage", false],
    ["trialing with subscription", { status: "trialing", trial_ends_at: "2026-11-10T00:00:00Z" }, "manage", false],
  ] as const)("chooses the correct action for %s", (_, overrides, action, history) => {
    const state = deriveState(row(overrides));
    expect(billingPresentation(state, true).primaryAction).toBe(action);
    expect(billingPresentation(state, true).showHistory).toBe(history);
    expect(hasLiveSubscription(state)).toBe(action === "manage");
  });
  it.each([
    [true, false, "standard", 199, "founding"],
    [false, false, "founding", 299, "standard"],
    [false, true, "founding", 199, "founding"],
    [true, true, "standard", 299, "standard"],
  ] as const)("card and checkout agree on price (founding=%s, subscription=%s)", (founding, subscribed, plan, price, expectedPlan) => {
    vi.stubEnv("STRIPE_PRICE_FOUNDING", "price_199");
    vi.stubEnv("STRIPE_PRICE_STANDARD", "price_299");
    try {
      const state = deriveState(row({ plan, stripe_subscription_id: subscribed ? "sub_existing" : null }));
      const card = billingPresentation(state, founding);
      expect(card.plan).toBe(expectedPlan);
      expect(card.priceKr).toBe(price);
      // Existing subscriptions retain their Stripe plan; new checkout uses eligibility.
      const checkoutFounding = subscribed ? plan === "founding" : founding;
      expect(checkoutPlan(checkoutFounding)).toBe(expectedPlan);
      expect(resolvePriceId(checkoutFounding)).toBe(`price_${card.priceKr}`);
    } finally { vi.unstubAllEnvs(); }
  });
  it("protects an active subscription against customer replacement", () => {
    expect(hasProtectedSubscription(row())).toBe(true);
    expect(billingStatus(deriveState(row()))).toBe("active");
  });
  it("protects a trialing Stripe subscription", () => {
    expect(hasProtectedSubscription(row({ status: "trialing", trial_ends_at: "2026-11-10T00:00:00Z" }))).toBe(true);
  });
  it("permits a free app trial without a Stripe subscription to subscribe", () => {
    const trial = row({ status: "trialing", trial_ends_at: "2026-11-10T00:00:00Z", stripe_subscription_id: null });
    expect(hasProtectedSubscription(trial)).toBe(false);
    expect(billingStatus(deriveState(trial))).toBe("trial");
  });
  it("protects cancel-scheduled subscriptions while still active", () => {
    const canceled = row({ cancel_at_period_end: true });
    expect(hasProtectedSubscription(canceled)).toBe(true);
    expect(billingStatus(deriveState(canceled))).toBe("cancelScheduled");
  });
  it("protects the derived past-due grace period too", () => {
    expect(hasProtectedSubscription(row({ status: "past_due" }))).toBe(true);
  });
  it("permits the expired August row to recover and labels it expired, not active", () => {
    const expired = row({ current_period_end: "2026-08-27T20:29:28Z" });
    expect(hasProtectedSubscription(expired)).toBe(false);
    expect(deriveState(expired).isReadOnly).toBe(true);
    expect(billingStatus(deriveState(expired))).toBe("expired");
    expect(deriveState(expired).endsAt?.toISOString()).toBe("2026-08-27T20:29:28.000Z");
  });
  it("does not protect a missing subscription row", () => {
    expect(hasProtectedSubscription(null)).toBe(false);
  });
  it("only handles missing customer errors, not missing prices or network failures", () => {
    expect(isMissingCustomer({ code: "resource_missing", param: "customer" })).toBe(true);
    expect(isMissingCustomer({ code: "resource_missing", param: "id" }, true)).toBe(true);
    expect(isMissingCustomer({ code: "resource_missing", param: "id" })).toBe(false);
    expect(isMissingCustomer({ code: "resource_missing", param: "price" })).toBe(false);
    expect(isMissingCustomer(new Error("network"))).toBe(false);
  });
  it("maps missing-customer and unknown provider failures to safe translated keys", () => {
    expect(billingErrorKey(new Error("customer_not_found"))).toBe("billing.errors.customerNotFound");
    expect(billingErrorKey(new Error("No such customer: private provider details"))).toBe("billing.errors.generic");
  });
});
describe("founding deadline (family created by 31 Dec 2026, Stockholm)", () => {
  it.each([
    ["2026-12-31T23:59:00+01:00", true, 199],
    ["2027-01-01T00:00:00+01:00", false, 299],
  ] as const)("created %s → founding=%s, card = checkout = %s kr", (at, founding, kr) => {
    vi.stubEnv("STRIPE_PRICE_FOUNDING", "price_199");
    vi.stubEnv("STRIPE_PRICE_STANDARD", "price_299");
    try {
      const f = isFoundingAt(new Date(at));
      expect(f).toBe(founding);
      const card = billingPresentation(deriveState(row({ status: "none", stripe_subscription_id: null })), f);
      expect(card.priceKr).toBe(kr);
      expect(resolvePriceId(f)).toBe(`price_${card.priceKr}`);
    } finally { vi.unstubAllEnvs(); }
  });
});
