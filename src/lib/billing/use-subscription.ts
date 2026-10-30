import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFamilySubscription } from "@/lib/billing/billing.functions";

import { deriveState, type SubscriptionRow } from "./subscription-state";
export { deriveState, type SubscriptionRow, type SubscriptionState } from "./subscription-state";

export function useFamilySubscription(familyId: string | undefined) {
  const fetchSub = useServerFn(getFamilySubscription);
  return useQuery({
    queryKey: ["family-subscription", familyId],
    enabled: !!familyId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!familyId) return deriveState(null);
      const row = (await fetchSub({
        data: { familyId },
      })) as SubscriptionRow;
      return deriveState(row);
    },
  });
}
