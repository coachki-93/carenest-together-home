import { Check, X, Wrench, ShoppingBasket } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Household mocks — split into three self-contained cards used by the
 * restyled HOUSEHOLD band on /features. Each mock is one product surface
 * (shopping list, end-of-shift tidy chips, upcoming maintenance strip).
 *
 * Choreography is gated per-card by the surrounding Reveal wrapper: when
 * data-visible flips on the parent, mk-slide-in / mk-check-pop run once.
 * Reduced motion is handled by the stylesheets — final state renders
 * immediately. Tidy chips still tick in sequence (500 → 650 → 800ms).
 */

const K = "featuresV2.household.mock";

export function ShoppingMock() {
  const { t } = useTranslation();
  return (
    <div
      className="mk-slide-in rounded-2xl border border-marketing-line bg-marketing-bg p-3.5"
      style={{ ["--mk-delay" as string]: "0ms" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <ShoppingBasket
          className="size-3.5"
          style={{ color: "var(--color-marketing-sage)" }}
        />
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted">
          {t(`${K}.shopHeader`)}
        </p>
      </div>
      <ul className="space-y-1">
        <li className="flex items-center gap-2 text-[12.5px] text-marketing-ink">
          <span className="size-1.5 rounded-full bg-marketing-muted/60" aria-hidden />
          {t(`${K}.shop1`)}
        </li>
        <li className="flex items-center gap-2 text-[12.5px] text-marketing-ink">
          <span className="size-1.5 rounded-full bg-marketing-muted/60" aria-hidden />
          {t(`${K}.shop2`)}
        </li>
        <li className="flex items-center gap-2 text-[12.5px] text-marketing-ink">
          <span className="size-1.5 rounded-full bg-marketing-muted/60" aria-hidden />
          {t(`${K}.shop3`)}
        </li>
      </ul>
    </div>
  );
}

export function TidyMock() {
  const { t } = useTranslation();
  const chipBase =
    "mk-check-pop inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold";
  const chipDone =
    chipBase +
    " bg-[color-mix(in_oklab,var(--color-marketing-sage)_22%,var(--color-marketing-bg))] text-[color:var(--color-marketing-sage)]";
  const chipSkipped =
    chipBase + " border border-marketing-line text-marketing-muted bg-marketing-surface";
  return (
    <div
      className="mk-slide-in rounded-2xl border border-marketing-line bg-marketing-bg p-3.5"
      style={{ ["--mk-delay" as string]: "0ms" }}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted mb-2">
        {t(`${K}.tidyHeader`)}
      </p>
      <div className="flex flex-wrap gap-2">
        <span
          className={chipDone}
          style={{ ["--mk-delay" as string]: "500ms" }}
        >
          <Check className="size-3" />
          {t(`${K}.roomKitchen`)}
        </span>
        <span
          className={chipDone}
          style={{ ["--mk-delay" as string]: "650ms" }}
        >
          <Check className="size-3" />
          {t(`${K}.roomBed`)}
        </span>
        <span
          className={chipSkipped}
          style={{ ["--mk-delay" as string]: "800ms" }}
        >
          <X className="size-3" />
          {t(`${K}.roomBath`)}
        </span>
      </div>
    </div>
  );
}

export function MaintenanceMock() {
  const { t } = useTranslation();
  return (
    <div
      className="mk-slide-in flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-[12.5px]"
      style={{
        background:
          "color-mix(in oklab, oklch(0.78 0.13 70) 14%, var(--color-marketing-bg))",
        color: "oklch(0.36 0.10 55)",
        ["--mk-delay" as string]: "0ms",
      }}
    >
      <Wrench className="size-4 flex-none" />
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold opacity-80 mb-0.5">
          {t(`${K}.maintHeader`)}
        </p>
        <p className="font-semibold">{t(`${K}.maint`)}</p>
      </div>
    </div>
  );
}

/** Legacy combined mock — kept exported for any lingering imports. */
export function HouseholdMock() {
  return (
    <div className="mk-glass mk-glass-border rounded-3xl p-4 md:p-5 shadow-2xl space-y-3 max-w-md">
      <ShoppingMock />
      <TidyMock />
      <MaintenanceMock />
    </div>
  );
}
