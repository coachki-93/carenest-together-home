import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  OUTCOME_DECK_THEME,
  type OutcomeDef,
} from "@/components/marketing/OutcomeDeck";

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

/**
 * Mobile-only (<md) presentation of the outcomes deck: a tabbed switcher
 * showing one card at a time. Deliberately imports NO fan geometry
 * (FAN / PART / CARD_W / CARD_H) — no translate, rotate or absolute
 * positioning, so the desktop deck's transforms cannot leak in and clip.
 */
export function OutcomeSwitcher({ cards }: { cards: readonly OutcomeDef[] }) {
  const { t } = useTranslation();
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

  const active = cards[index]!;
  const theme = OUTCOME_DECK_THEME[active.theme];
  const Icon = active.icon;
  const Vignette = active.Vignette;

  return (
    <div className="w-full min-w-0">
      <div
        role="tablist"
        aria-label={t("marketing.outcomes.title")}
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((c, i) => {
          const ct = OUTCOME_DECK_THEME[c.theme];
          const CIcon = c.icon;
          const on = i === index;
          return (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setIndex(i)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{
                background: on ? ct.chipBg : "transparent",
                borderColor: on ? ct.border : "var(--color-marketing-line)",
                color: on ? ct.eyebrow : "var(--color-marketing-muted)",
              }}
            >
              <CIcon className="size-3.5" />
              {t(c.eyebrowKey)}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        key={active.key}
        className="w-full min-w-0 overflow-hidden rounded-3xl border p-5"
        style={{
          background: theme.bg,
          borderColor: theme.border,
          animation: reduced ? undefined : "fade-in 0.3s ease-out",
        }}
      >
        <div className="mb-3 flex items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl"
            style={{ background: theme.chipBg, color: theme.chipFg }}
          >
            <Icon className="size-5" />
          </span>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: theme.eyebrow }}
          >
            {t(active.eyebrowKey)}
          </p>
        </div>
        <h3
          className="mb-3 text-display-xs"
          style={{ ...display, color: theme.ink, textWrap: "balance" as never }}
        >
          {t(active.headlineKey)}
        </h3>
        <p className="mb-4 text-sm leading-relaxed" style={{ color: theme.bodyMuted }}>
          {t(active.bodyKey)}
        </p>
        <div className="min-w-0">
          <Vignette />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label="Previous"
          className="grid size-9 place-items-center rounded-full border border-marketing-line bg-marketing-bg text-marketing-ink disabled:opacity-35"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-semibold tabular-nums text-marketing-muted">
          {index + 1} / {cards.length}
        </span>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))}
          disabled={index === cards.length - 1}
          aria-label="Next"
          className="grid size-9 place-items-center rounded-full border border-marketing-line bg-marketing-bg text-marketing-ink disabled:opacity-35"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
