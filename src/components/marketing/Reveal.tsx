import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Marketing Reveal — fade-up on intersection, or immediate on mount (with
 * per-instance stagger). Extracted from src/routes/index.tsx so vignette
 * building blocks can compose it. Reduced-motion is fully respected:
 * `prefers-reduced-motion: reduce` skips the transform + opacity transition
 * and shows content immediately.
 */
export function Reveal({
  children,
  className = "",
  delayMs = 0,
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
    if (immediate) {
      const raf = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(raf);
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  return (
    <div
      ref={ref}
      className={className}
      data-visible={visible ? "true" : "false"}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible || reduced ? "translateY(0)" : "translateY(14px)",
        transition: reduced
          ? "none"
          : `opacity 0.55s ease-out ${delayMs}ms, transform 0.55s ease-out ${delayMs}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
