export function isMissingCustomer(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; param?: string };
  return e.code === "resource_missing" &&
    (e.param === "customer" || e.param === "customer_id");
}

export function billingErrorKey(error: Error): string {
  switch (error.message) {
    case "customer_not_found": return "billing.errors.customerNotFound";
    case "subscription_exists": return "billing.errors.subscriptionExists";
    default: return "billing.errors.generic";
  }
}