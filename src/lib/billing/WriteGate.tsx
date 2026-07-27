import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { useMyMembership } from "@/lib/auth/use-profile";
import { useFamilySubscription } from "@/lib/billing/use-subscription";

const ReadOnlyContext = createContext<boolean>(false);

/**
 * Provides the family's read-only status to descendants. Wrap once high
 * in the tree (DashboardLayout). Fails safe: while loading, treats the
 * family as WRITABLE — the authoritative server enforcement lives in
 * `assertFamilySubscriptionActive` inside each write server function.
 * This context only controls the UI (disabled buttons, hidden CTAs).
 */
export function ReadOnlyProvider({ children }: { children: ReactNode }) {
  const membership = useMyMembership();
  const familyId = membership.data?.family_id;
  const sub = useFamilySubscription(familyId);
  const readOnly = sub.data?.isReadOnly === true;
  return (
    <ReadOnlyContext.Provider value={readOnly}>
      {children}
    </ReadOnlyContext.Provider>
  );
}

export function useIsReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}
