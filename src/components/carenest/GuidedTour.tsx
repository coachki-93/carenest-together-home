import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface TourStep {
  target: string; // CSS selector, usually [data-tour="..."]
  titleKey: string;
  bodyKey: string;
  /** Fallback placement when there is room. Defaults to "bottom". */
  placement?: "top" | "bottom" | "left" | "right";
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  open: boolean;
  steps: TourStep[];
  onClose: () => void;
  onFinish: () => void;
}

const PADDING = 8;

export function GuidedTour({ open, steps, onClose, onFinish }: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Reset to first step every time the tour reopens.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const step = steps[index];

  // Measure the target element and re-measure on resize/scroll.
  useLayoutEffect(() => {
    if (!open || !step) return;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      raf = window.requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      });
    };
    measure();
    const onScrollResize = () => measure();
    window.addEventListener("resize", onScrollResize);
    window.addEventListener("scroll", onScrollResize, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onScrollResize);
      window.removeEventListener("scroll", onScrollResize, true);
    };
  }, [open, step]);

  const tooltipStyle = useMemo<React.CSSProperties>(() => {
    if (typeof window === "undefined") return { top: 0, left: 0 };
    if (!rect) {
      return {
        top: window.innerHeight / 2 - 80,
        left: window.innerWidth / 2 - 180,
      };
    }
    const tooltipW = 360;
    const tooltipH = tooltipRef.current?.offsetHeight ?? 200;
    const vpH = window.innerHeight;
    const vpW = window.innerWidth;
    let top = rect.top + rect.height + 16;
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    if (top + tooltipH > vpH - 16) {
      top = rect.top - tooltipH - 16; // flip above
    }
    if (top < 16) top = 16;
    if (left < 16) left = 16;
    if (left + tooltipW > vpW - 16) left = vpW - tooltipW - 16;
    return { top, left, width: tooltipW };
  }, [rect]);

  if (!open || typeof document === "undefined" || !step) return null;

  function next() {
    if (index >= steps.length - 1) {
      onFinish();
    } else {
      setIndex((i) => i + 1);
    }
  }
  function back() {
    setIndex((i) => Math.max(0, i - 1));
  }

  const isLast = index >= steps.length - 1;

  const overlay = (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Spotlight via four rectangles around the target */}
      {rect ? (
        <>
          <div
            className="absolute bg-foreground/55 backdrop-blur-[2px] transition-all"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: Math.max(0, rect.top - PADDING),
            }}
            onClick={onClose}
          />
          <div
            className="absolute bg-foreground/55 backdrop-blur-[2px] transition-all"
            style={{
              top: Math.max(0, rect.top - PADDING),
              left: 0,
              width: Math.max(0, rect.left - PADDING),
              height: rect.height + PADDING * 2,
            }}
            onClick={onClose}
          />
          <div
            className="absolute bg-foreground/55 backdrop-blur-[2px] transition-all"
            style={{
              top: Math.max(0, rect.top - PADDING),
              left: rect.left + rect.width + PADDING,
              right: 0,
              height: rect.height + PADDING * 2,
            }}
            onClick={onClose}
          />
          <div
            className="absolute bg-foreground/55 backdrop-blur-[2px] transition-all"
            style={{
              top: rect.top + rect.height + PADDING,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onClick={onClose}
          />
          {/* Highlight ring */}
          <div
            className="pointer-events-none absolute rounded-2xl ring-4 ring-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_30%,transparent)] transition-all"
            style={{
              top: rect.top - PADDING,
              left: rect.left - PADDING,
              width: rect.width + PADDING * 2,
              height: rect.height + PADDING * 2,
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 bg-foreground/55 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute card-soft p-5 shadow-xl bg-card border border-border/60 transition-all"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
              {t("tour.stepOf", { current: index + 1, total: steps.length })}
            </div>
            <h3 className="text-lg font-extrabold leading-tight">{t(step.titleKey)}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full -mt-1 -mr-1"
            onClick={onClose}
            aria-label={t("tour.skip")}
          >
            <X className="size-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t(step.bodyKey)}</p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`size-1.5 rounded-full transition-colors ${
                i === index ? "bg-primary w-4" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={onClose}
          >
            {t("tour.skip")}
          </Button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={back}
              >
                {t("tour.back")}
              </Button>
            )}
            <Button size="sm" className="rounded-full font-bold" onClick={next}>
              {isLast ? t("tour.finish") : t("tour.next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
