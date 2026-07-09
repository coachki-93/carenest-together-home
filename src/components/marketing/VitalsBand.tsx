import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HeartPulse, Wind, Thermometer, Droplets, Droplet } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";
import { SpO2DropletIcon } from "@/components/icons/SpO2DropletIcon";

const display = { fontFamily: "var(--font-display)", fontWeight: 600 } as const;

/**
 * VITALS band — deep-violet section showing the app's real vitals snapshot
 * treatment. Age-adjusted screening bands with a demo 4-year-old profile:
 * HR 70–115 bpm, breathing 20–25 br/min, SpO2 95–100 %, temp 36.0–37.9 °C.
 * Fluids has no reference band → running-total treatment. Glucose is a
 * planned-feature tile with a muted outline pill.
 */
export function VitalsBand() {
  const { t } = useTranslation();
  return (
    <section className="px-6 md:px-8 py-20 md:py-28">
      <Reveal className="max-w-6xl mx-auto">
        <div
          className="rounded-3xl p-8 md:p-14 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--primary) 92%, black) 0%, color-mix(in oklab, var(--primary) 78%, transparent) 100%)",
            color: "var(--primary-foreground)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background:
                "radial-gradient(30rem 20rem at 90% 10%, color-mix(in oklab, white 20%, transparent), transparent 70%)",
            }}
          />
          <div className="relative grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] mb-5 opacity-80">
                {t("marketing.vitals.kicker")}
              </p>
              <h2 className="text-display-md mb-6" style={display}>
                {t("marketing.vitals.title")}
              </h2>
              <p className="text-base md:text-lg leading-[1.7] opacity-90 max-w-xl">
                {t("marketing.vitals.sub")}
              </p>
            </div>

            <div className="relative">
              <div className="rounded-2xl bg-marketing-bg text-marketing-ink shadow-2xl border border-marketing-line p-4 md:p-5 rotate-[-1deg]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <VitalTile
                    icon={<HeartPulse className="size-4 text-marketing-sage" />}
                    label={t("marketing.vitals.hr.label")}
                    value="98"
                    unit="bpm"
                    low={70}
                    high={115}
                    reading={98}
                    rangeCaption="70 – 115 bpm"
                  />
                  <VitalTile
                    icon={<SpO2DropletIcon size={16} />}
                    label={t("marketing.vitals.spo2.label")}
                    value="98"
                    unit="%"
                    low={95}
                    high={100}
                    reading={98}
                    rangeCaption="95 – 100 %"
                  />
                  <VitalTile
                    icon={<Wind className="size-4 text-marketing-sage" />}
                    label={t("marketing.vitals.breathing.label")}
                    value="22"
                    unit="br/min"
                    low={20}
                    high={25}
                    reading={22}
                    rangeCaption="20 – 25 br/min"
                  />
                  <VitalTile
                    icon={<Thermometer className="size-4 text-marketing-sage" />}
                    label={t("marketing.vitals.temp.label")}
                    value="37.0"
                    unit="°C"
                    low={36.0}
                    high={37.9}
                    reading={37.0}
                    rangeCaption="36.0 – 37.9 °C"
                  />
                  <VitalTile
                    icon={<Droplets className="size-4 text-marketing-sage" />}
                    label={t("marketing.vitals.fluids.label")}
                    value="620"
                    unit="ml"
                    runningTotalLabel={t("marketing.vitals.fluidsToday")}
                  />
                  <PlannedTile
                    label={t("marketing.vitals.glucose.label")}
                    plannedText={t("marketing.vitals.glucose.planned")}
                    a11y={t("marketing.vitals.glucose.a11y")}
                  />
                </div>
                <p className="mt-4 text-[11px] text-marketing-muted leading-snug px-1">
                  {t("marketing.vitals.footnote")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

interface TileProps {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  low?: number;
  high?: number;
  reading?: number;
  rangeCaption?: string;
  runningTotalLabel?: string;
}

function VitalTile({
  icon,
  label,
  value,
  unit,
  low,
  high,
  reading,
  rangeCaption,
  runningTotalLabel,
}: TileProps) {
  const hasBand =
    typeof low === "number" && typeof high === "number" && typeof reading === "number";
  // Rail domain gives a little headroom around the band so the band segment
  // isn't the full rail width. Domain = [low - 20%, high + 20%] of the band.
  let bandStart = 0;
  let bandEnd = 0;
  let dot = 0;
  if (hasBand) {
    const span = high! - low!;
    const pad = Math.max(span * 0.35, 0.5);
    const domainLo = low! - pad;
    const domainHi = high! + pad;
    const scale = (x: number) => ((x - domainLo) / (domainHi - domainLo)) * 100;
    bandStart = scale(low!);
    bandEnd = scale(high!);
    dot = scale(reading!);
  }
  return (
    <div className="rounded-2xl bg-marketing-surface border border-marketing-line p-3.5 md:p-4">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-marketing-muted">
          {label}
        </p>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl text-marketing-ink" style={display}>
          {value}
        </span>
        <span className="text-xs text-marketing-muted">{unit}</span>
      </div>
      {hasBand ? (
        <div className="mt-3">
          <div className="relative h-1.5 rounded-full bg-marketing-line/70 overflow-hidden">
            <div
              className="absolute inset-y-0 rounded-full bg-marketing-sage/45"
              style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
            />
          </div>
          <div className="relative h-0" aria-hidden>
            <div
              className="absolute -top-[7px] size-2 rounded-full bg-marketing-sage ring-2 ring-marketing-bg"
              style={{ left: `calc(${dot}% - 4px)` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-marketing-muted">{rangeCaption}</p>
        </div>
      ) : (
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-marketing-line/70" />
          <p className="mt-2 text-[10px] text-marketing-muted">{runningTotalLabel}</p>
        </div>
      )}
    </div>
  );
}

function PlannedTile({
  label,
  plannedText,
  a11y,
}: {
  label: string;
  plannedText: string;
  a11y: string;
}) {
  return (
    <div
      className="rounded-2xl border border-dashed border-marketing-line bg-transparent p-3.5 md:p-4 opacity-80"
      aria-label={a11y}
      role="group"
    >
      <div className="flex items-center gap-1.5">
        <Droplet className="size-4 text-marketing-muted" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-marketing-muted">
          {label}
        </p>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className="text-2xl text-marketing-muted/70"
          style={display}
          aria-hidden
        >
          — 
        </span>
        <span className="text-xs text-marketing-muted">mmol/L</span>
      </div>
      <div className="mt-3">
        <span className="inline-flex items-center rounded-full border border-marketing-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-marketing-muted bg-transparent">
          {plannedText}
        </span>
      </div>
    </div>
  );
}

export default VitalsBand;
