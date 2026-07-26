import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WelcomePage, WelcomeTone } from "@/lib/onboarding/welcome-scenario";
import { EnableNotificationsCard } from "@/components/carenest/EnableNotificationsCard";

interface Props {
  open: boolean;
  pages: WelcomePage[];
  onClose: () => void;
  onFinish: () => void;
}

const TONE_TILE: Record<WelcomeTone, string> = {
  primary: "bg-primary/12 text-primary",
  sky: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  emerald: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
};

export function WelcomeTour({ open, pages, onClose, onFinish }: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined" || pages.length === 0) return null;

  const safeIndex = Math.min(index, pages.length - 1);
  const page = pages[safeIndex];
  const isLast = safeIndex >= pages.length - 1;
  const Icon = page.icon;

  function next() {
    if (isLast) {
      onFinish();
    } else {
      setIndex(safeIndex + 1);
    }
  }

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-foreground/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="w-full max-w-lg card-soft bg-card border border-border/60 shadow-2xl p-6 sm:p-8 relative animate-in fade-in-0 zoom-in-95 duration-200">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 rounded-full text-muted-foreground"
          onClick={onClose}
          aria-label={t("welcome.skip")}
        >
          <X className="size-4" />
        </Button>

        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "size-20 sm:size-24 rounded-3xl flex items-center justify-center mb-5",
              TONE_TILE[page.tone],
            )}
          >
            <Icon className="size-10 sm:size-12" strokeWidth={1.75} />
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {t("welcome.stepOf", { current: safeIndex + 1, total: pages.length })}
          </div>
          <h2
            id="welcome-title"
            className="text-2xl sm:text-3xl font-extrabold leading-tight mb-3"
          >
            {t(page.titleKey)}
          </h2>
          <p className="text-base text-muted-foreground max-w-md">
            {t(page.bodyKey)}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 my-6">
          {pages.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === safeIndex ? "w-6 bg-primary" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            onClick={onClose}
          >
            {t("welcome.skip")}
          </Button>
          <Button
            size="lg"
            className="rounded-full font-bold px-6"
            onClick={next}
          >
            {isLast ? t("welcome.finish") : t("welcome.next")}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

