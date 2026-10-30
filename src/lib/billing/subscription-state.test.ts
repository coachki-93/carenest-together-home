import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { billingStatus, deriveState, hasProtectedSubscription, type SubscriptionRow } from "./subscription-state";
import { billingErrorKey, isMissingCustomer } from "./billing-errors";

const row = (overrides: Partial<NonNullable<SubscriptionRow>> = {}): NonNullable<SubscriptionRow> => ({
  status: "active", plan: "founding", trial_ends_at: null,
  current_period_end: "2026-11-30T00:00:00Z", cancel_at_period_end: false,
  stripe_customer_id: "cus_missing", stripe_subscription_id: "sub_existing", ...overrides,
});

describe("billing recovery and shared derived state", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-30T23:42:00Z")); });
  afterEach(() => vi.useRealTimers());
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
    expect(isMissingCustomer({ code: "resource_missing", param: "price" })).toBe(false);
    expect(isMissingCustomer(new Error("network"))).toBe(false);
  });
  it("maps missing-customer and unknown provider failures to safe translated keys", () => {
    expect(billingErrorKey(new Error("customer_not_found"))).toBe("billing.errors.customerNotFound");
    expect(billingErrorKey(new Error("No such customer: private provider details"))).toBe("billing.errors.generic");
  });
});