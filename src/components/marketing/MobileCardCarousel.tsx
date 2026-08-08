import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Mobile-only scroll-snap carousel.
 *
 * Native CSS scroll-snap track — no carousel library, no drag handlers, so
 * momentum scrolling, keyboard and screen readers behave natively. Each slide
 * is exactly `w-full shrink-0`, so a slide can never exceed the viewport and
 * the track's `overflow-hidden` wrapper prevents page-level horizontal
 * overflow.
 *
 * Respects prefers-reduced-motion: programmatic scrolls fall back to
 * `behavior: "auto"`.
 */
export function MobileCardCarousel({
  slides,
  label,
  dotLabel,
}: {
  slides: ReactNode[];
  label: string;
  dotLabel: (i: number, total: number) => string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const evalMq = () => setReduced(mq.matches);
    evalMq();
    mq.addEventListener("change", evalMq);
    return () => mq.removeEventListener("change", evalMq);
  }, []);

  const onScroll = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const el = trackRef.current;
      if (!el) return;
      const w = el.clientWidth || 1;
      const next = Math.round(el.scrollLeft / w);
      setIndex((cur) => (cur === next ? cur : Math.min(slides.length - 1, Math.max(0, next))));
    });
  }, [slides.length]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.min(slides.length - 1, Math.max(0, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    setIndex(clamped);
  };

  return (
    <div className="w-full overflow-hidden" role="group" aria-roledescription="carousel" aria-label={label}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => (
          <div
            key={i}
            className="w-full min-w-0 shrink-0 snap-center px-1"
            role="group"
            aria-roledescription="slide"
            aria-label={dotLabel(i, slides.length)}
          >
            {s}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-marketing-line bg-marketing-bg text-marketing-ink disabled:opacity-35"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={dotLabel(i, slides.length)}
              aria-current={i === index}
              className="grid size-6 place-items-center"
            >
              <span
                className="block rounded-full transition-all duration-200"
                style={{
                  width: i === index ? 22 : 8,
                  height: 8,
                  background:
                    i === index
                      ? "var(--color-marketing-sage)"
                      : "var(--color-marketing-line)",
                }}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === slides.length - 1}
          aria-label="Next"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-marketing-line bg-marketing-bg text-marketing-ink disabled:opacity-35"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
