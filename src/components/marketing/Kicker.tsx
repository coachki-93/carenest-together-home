import type { ReactNode } from "react";

/**
 * Marketing Kicker — bare sage all-caps eyebrow. Shared across landing,
 * About, and Install so the three surfaces can't drift. No dot, no pill.
 */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-marketing-sage">
      {children}
    </span>
  );
}
