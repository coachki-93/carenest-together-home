import { Hospital, Bell } from "lucide-react";

/**
 * OxygenMock — tank countdown card with the hospital-paused state.
 *
 * Numbers derived from the real duration table
 * (src/lib/oxygen/tanks.ts, LIV_MINI_2L @ 0.10 L/min → 2 d 16 h total).
 * We show a mid-tank state after ~4 h of elapsed use → remaining ≈ 2 d 12 h.
 * Warnings shown at the app defaults (60 min and 20 min).
 */

export function OxygenMock() {
  return (
    <div className="mk-glass mk-glass-border rounded-3xl p-5 md:p-6 shadow-2xl">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted">
            Syrgas · tub 2
          </p>
          <p className="text-lg font-bold text-marketing-ink" style={{ fontFamily: "var(--font-display)" }}>
            LIV Mini 2 L · 0,10 l/min
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{
            background:
              "color-mix(in oklab, oklch(0.62 0.18 25) 16%, var(--color-marketing-bg))",
            color: "oklch(0.42 0.16 25)",
          }}
        >
          <Hospital className="size-3.5" />
          Pausad — på sjukhus
        </span>
      </div>

      {/* Big countdown */}
      <div className="rounded-2xl bg-marketing-surface border border-marketing-line px-4 py-5 mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-marketing-muted mb-1">
          Återstår
        </p>
        <p
          className="text-4xl md:text-5xl font-bold text-marketing-ink tabular-nums"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ≈ 2 d 12 h
        </p>
        <p className="text-[12px] text-marketing-muted mt-1.5">
          Slår igång automatiskt när sjukhusläget stängs av.
        </p>
      </div>

      {/* Progress bar (paused mid-tank) */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] text-marketing-muted mb-1.5">
          <span className="font-semibold">Kvar i tuben</span>
          <span>~94%</span>
        </div>
        <div className="h-1.5 rounded-full bg-marketing-line overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: "94%",
              background:
                "repeating-linear-gradient(90deg, var(--color-marketing-sage) 0 8px, color-mix(in oklab, var(--color-marketing-sage) 55%, transparent) 8px 12px)",
            }}
          />
        </div>
      </div>

      {/* Warnings */}
      <div className="flex items-center gap-2 text-[12px] text-marketing-muted">
        <Bell className="size-3.5 flex-none" />
        <span>Varning vid 60 min och 20 min.</span>
      </div>
    </div>
  );
}
