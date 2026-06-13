/** Local-only state for the guided dashboard tour. Keyed by user id. */
const KEY = (userId: string) => `carenest.tour.dashboard.done.${userId}`;

export function isTourDone(userId: string | undefined): boolean {
  if (!userId || typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(KEY(userId)) === "1";
  } catch {
    return true;
  }
}

export function markTourDone(userId: string | undefined) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(userId), "1");
  } catch {
    // ignore
  }
}

export function resetTour(userId: string | undefined) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY(userId));
  } catch {
    // ignore
  }
}
