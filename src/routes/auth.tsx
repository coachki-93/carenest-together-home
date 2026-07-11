import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LanguageToggle } from "@/components/carenest/LanguageToggle";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthLayout,
});

/**
 * Auth shell — single centered card floating over a purple sky.
 * Sky and cloud tints are parameterized via CSS custom properties so
 * they can be live-tuned in DevTools.
 */
function AuthLayout() {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={
        {
          // Sky stops (deeper violet → lighter pink-violet at horizon)
          ["--sky-top" as string]: "oklch(0.55 0.17 290)",
          ["--sky-mid" as string]: "oklch(0.72 0.13 305)",
          ["--sky-bot" as string]: "oklch(0.88 0.06 320)",
          // Cloud tint (pale pink/white, translucent)
          ["--cloud-tint" as string]: "oklch(0.98 0.02 340)",
          ["--cloud-alpha" as string]: "0.55",
          ["--cloud-alpha-soft" as string]: "0.35",
          background:
            "linear-gradient(to bottom, var(--sky-top) 0%, var(--sky-mid) 55%, var(--sky-bot) 100%)",
        } as React.CSSProperties
      }
    >
      {/* Cloud layer — asymmetric radial gradients, painted softness */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            // Upper-left soft haze
            "radial-gradient(60% 40% at 18% 22%, color-mix(in oklab, var(--cloud-tint) calc(var(--cloud-alpha-soft) * 100%), transparent) 0%, transparent 70%)",
            // Right mid-band cloud
            "radial-gradient(50% 32% at 82% 48%, color-mix(in oklab, var(--cloud-tint) calc(var(--cloud-alpha) * 100%), transparent) 0%, transparent 72%)",
            // Bottom-left horizon cloud
            "radial-gradient(70% 45% at 12% 88%, color-mix(in oklab, var(--cloud-tint) calc(var(--cloud-alpha) * 100%), transparent) 0%, transparent 68%)",
            // Bottom-right horizon cloud
            "radial-gradient(65% 40% at 78% 92%, color-mix(in oklab, var(--cloud-tint) calc(var(--cloud-alpha-soft) * 100%), transparent) 0%, transparent 70%)",
          ].join(", "),
          filter: "blur(2px)",
        }}
      />
      {/* Grain texture on top of clouds */}
      <div aria-hidden="true" className="mk-grain pointer-events-none absolute inset-0 opacity-40" />

      {/* Language toggle — floating top-right on a translucent pill */}
      <div className="absolute right-4 top-4 z-20 md:right-6 md:top-6">
        <div className="rounded-full bg-white/70 backdrop-blur-md shadow-sm ring-1 ring-white/60">
          <LanguageToggle />
        </div>
      </div>

      {/* Centered card */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] rounded-3xl bg-card text-card-foreground shadow-[0_30px_80px_-30px_rgba(60,20,90,0.35),0_10px_30px_-15px_rgba(60,20,90,0.25)] ring-1 ring-black/[0.04] p-7 sm:p-9">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
