import { useEffect, useState } from "react";

/**
 * HeroHeadline — two-line declarative headline used by the landing hero
 * and the /about hero. Each word is its own inline-block mk-headline-gradient
 * span; words stagger in on mount. Reduced-motion skips the entrance.
 *
 * Shared between src/routes/index.tsx and src/routes/about.tsx so the two
 * heroes can't drift.
 */

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

export function HeroHeadline({ line1, line2 }: { line1: string; line2: string }) {
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) {
      setVisible(true);
      return;
    }
    const raf = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);
  const lines = [line1, line2];
  const words = lines.map((l) => l.split(" "));
  let idx = 0;
  return (
    <h1
      className="text-display-md xl:text-display-lg mx-auto text-center text-primary"
      style={display}
    >
      {words.map((ws, li) => (
        <span key={li} className="block md:whitespace-nowrap">
          {ws.map((w, i) => {
            const k = idx++;
            return (
              <span
                key={i}
                className="mk-headline-gradient inline-block"
                style={{
                  opacity: visible || reduced ? 1 : 0,
                  transform: visible || reduced ? "translateY(0)" : "translateY(10px)",
                  transition: reduced
                    ? "none"
                    : `opacity 0.55s ease-out ${90 + k * 40}ms, transform 0.55s ease-out ${90 + k * 40}ms`,
                  willChange: "opacity, transform",
                }}
              >
                {w}
                {i < ws.length - 1 ? "\u00A0" : ""}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
