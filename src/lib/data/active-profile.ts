import { useCallback, useSyncExternalStore } from "react";
import {
  useCaregiverProfiles,
  useSuggestedCaregiverProfile,
  type CaregiverProfile,
} from "./caregiver-profiles";

function storageKey(familyId: string, userId: string) {
  return `carenest.active-profile.${familyId}.${userId}`;
}

/**
 * Module-level shared store for the account's active caregiver profile,
 * keyed by `${familyId}.${userId}`. All React consumers subscribe via
 * useSyncExternalStore, so setActive in one component (e.g. the care-place
 * dialog selector) is visible in every other component (header,
 * useCurrentActor, guarded writes) on the same render pass — no remount,
 * no storage-event round-trip in the writing tab. A `storage` listener
 * keeps other tabs in sync.
 */
type Key = string;
const memory = new Map<Key, string | null>();
const listeners = new Map<Key, Set<() => void>>();

function readLS(k: Key): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}

function writeLS(k: Key, v: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (v) window.localStorage.setItem(k, v);
    else window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

function getSnapshot(k: Key): string | null {
  if (memory.has(k)) return memory.get(k) ?? null;
  const v = readLS(k);
  memory.set(k, v);
  return v;
}

function setStored(k: Key, v: string | null) {
  const prev = memory.has(k) ? memory.get(k) ?? null : readLS(k);
  if (prev === v) {
    // Keep memory primed but don't spam subscribers on no-op writes.
    memory.set(k, v);
    return;
  }
  memory.set(k, v);
  writeLS(k, v);
  const subs = listeners.get(k);
  if (subs) for (const fn of subs) fn();
}

function subscribe(k: Key, cb: () => void): () => void {
  let set = listeners.get(k);
  if (!set) {
    set = new Set();
    listeners.set(k, set);
  }
  set.add(cb);
  return () => {
    const s = listeners.get(k);
    if (!s) return;
    s.delete(cb);
    if (s.size === 0) listeners.delete(k);
  };
}

// Cross-tab sync: another tab wrote to localStorage → refresh memory + notify.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (!e.key || !e.key.startsWith("carenest.active-profile.")) return;
    memory.set(e.key, e.newValue);
    const subs = listeners.get(e.key);
    if (subs) for (const fn of subs) fn();
  });
}

/**
 * Active caregiver profile for the current account in this family.
 * - Reads from a shared module store (backed by localStorage) so every
 *   consumer sees the same value within one render.
 * - Falls back to the time-based suggestion (suggest_caregiver_profile).
 * - Falls back to the account's first active profile.
 */
export function useActiveCaregiverProfile(
  familyId: string | undefined | null,
  userId: string | undefined | null,
) {
  const profiles = useCaregiverProfiles(familyId);
  const suggested = useSuggestedCaregiverProfile(familyId);

  const key = familyId && userId ? storageKey(familyId, userId) : null;

  const subscribeForKey = useCallback(
    (cb: () => void) => (key ? subscribe(key, cb) : () => {}),
    [key],
  );
  const getSnap = useCallback(() => (key ? getSnapshot(key) : null), [key]);
  const getServerSnap = useCallback(() => null, []);
  const storedId = useSyncExternalStore(subscribeForKey, getSnap, getServerSnap);

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
      if (!key) return;
      setStored(key, id);
    },
    [key],
  );

  return {
    profiles: mine,
    activeId,
    activeProfile,
    setActive,
    isLoading: profiles.isLoading,
  };
}
