import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFamilySubscription } from "@/lib/billing/billing.functions";

export type SubscriptionRow = {
  status:
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "unpaid"
    | "paused"
    | null;
  plan: "founding" | "standard" | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
} | null;

/**
 * Derived UI state from a subscription row. Mirrors the server-side
 * `is_family_subscription_active` helper so client gates and RLS agree.
 */
export type SubscriptionState = {
  row: SubscriptionRow;
  isActive: boolean;
  isReadOnly: boolean;
  isTrial: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  daysRemaining: number | null;
  endsAt: Date | null;
};

export function deriveState(row: SubscriptionRow): SubscriptionState {
  if (!row) {
    return {
      row,
      isActive: false,
      isReadOnly: true,
      isTrial: false,
      isPastDue: false,
      isCanceled: false,
      daysRemaining: null,
      endsAt: null,
    };
  }
  const now = Date.now();
  const trialEnds = row.trial_ends_at ? new Date(row.trial_ends_at) : null;
  const periodEnds = row.current_period_end
    ? new Date(row.current_period_end)
    : null;
  const trialing =
    row.status === "trialing" && !!trialEnds && trialEnds.getTime() > now;
  const active =
    row.status === "active" && !!periodEnds && periodEnds.getTime() > now;
  const pastDue =
    row.status === "past_due" && !!periodEnds && periodEnds.getTime() > now;
  const isActive = trialing || active || pastDue;
  const endsAt = trialing ? trialEnds : periodEnds;
  const daysRemaining = endsAt
    ? Math.max(
        0,
        Math.ceil((endsAt.getTime() - now) / (1000 * 60 * 60 * 24)),
      )
    : null;
  return {
    row,
    isActive,
    isReadOnly: !isActive,
    isTrial: trialing,
    isPastDue: pastDue,
    isCanceled: row.status === "canceled" || row.cancel_at_period_end === true,
    daysRemaining,
    endsAt,
  };
}

export function useFamilySubscription(familyId: string | undefined) {
  const fetchSub = useServerFn(getFamilySubscription);
  return useQuery({
    queryKey: ["family-subscription", familyId],
    enabled: !!familyId,
    staleTime: 60_000,
    queryFn: async () => {
      const row = (await fetchSub({
        data: { familyId: familyId! },
      })) as SubscriptionRow;
      return deriveState(row);
    },
  });
}
