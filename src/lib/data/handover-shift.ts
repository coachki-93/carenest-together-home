/**
 * Forward-looking shift window used by the "For your shift" section.
 * Ends at the next inferred shift boundary (00/12/18) plus a 4h buffer,
 * capped at 8h from now so a caregiver who opens the page mid-shift never
 * sees an unreasonably long list.
 */
export function nextShiftBoundary(now: Date): Date {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  const h = now.getHours();
  if (h < 12) d.setHours(12);
  else if (h < 18) d.setHours(18);
  else {
    d.setDate(d.getDate() + 1);
    d.setHours(0);
  }
  return d;
}

export interface ForwardShiftWindow {
  start: Date;
  end: Date;
}

export function getForwardShiftWindow(
  now: Date = new Date(),
): ForwardShiftWindow {
  const BUFFER_MS = 4 * 60 * 60 * 1000;
  const MAX_MS = 8 * 60 * 60 * 1000;
  const boundary = nextShiftBoundary(now);
  let endMs = boundary.getTime() + BUFFER_MS;
  const maxEnd = now.getTime() + MAX_MS;
  if (endMs > maxEnd) endMs = maxEnd;
  return { start: new Date(now), end: new Date(endMs) };
}
