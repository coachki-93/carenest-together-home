import { useCallback, useEffect, useState } from "react";
import {
  useCaregiverProfiles,
  useSuggestedCaregiverProfile,
  type CaregiverProfile,
} from "./caregiver-profiles";

function storageKey(familyId: string, userId: string) {
  return `carenest.active-profile.${familyId}.${userId}`;
}

/**
 * Active caregiver profile for the current account in this family.
 * - Reads from localStorage first (user's explicit choice).
 * - Falls back to the time-based suggestion (suggest_caregiver_profile).
 * - Falls back to the account's first active profile.
 */
export function useActiveCaregiverProfile(
  familyId: string | undefined | null,
  userId: string | undefined | null,
) {
  const profiles = useCaregiverProfiles(familyId);
  const suggested = useSuggestedCaregiverProfile(familyId);
  const [storedId, setStoredId] = useState<string | null>(null);

  // Hydrate from localStorage post-mount
  useEffect(() => {
    if (!familyId || !userId || typeof window === "undefined") return;
    try {
      setStoredId(window.localStorage.getItem(storageKey(familyId, userId)));
    } catch {
      /* ignore */
    }
  }, [familyId, userId]);

  const mine = (profiles.data ?? []).filter(
    (p) => p.account_user_id === userId && p.is_active,
  );

  let activeId: string | null = null;
  if (storedId && mine.some((p) => p.id === storedId)) {
    activeId = storedId;
  } else if (suggested.data && mine.some((p) => p.id === suggested.data)) {
    activeId = suggested.data;
  } else if (mine.length > 0) {
    activeId = mine[0].id;
  }

  const activeProfile: CaregiverProfile | null =
    mine.find((p) => p.id === activeId) ?? null;

  const setActive = useCallback(
    (id: string | null) => {
      if (!familyId || !userId || typeof window === "undefined") return;
      try {
        if (id) {
          window.localStorage.setItem(storageKey(familyId, userId), id);
        } else {
          window.localStorage.removeItem(storageKey(familyId, userId));
        }
      } catch {
        /* ignore */
      }
      setStoredId(id);
    },
    [familyId, userId],
  );

  return {
    profiles: mine,
    activeId,
    activeProfile,
    setActive,
    isLoading: profiles.isLoading,
  };
}
