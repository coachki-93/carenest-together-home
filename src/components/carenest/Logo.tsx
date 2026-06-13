import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

/** CareNest brand mark: a soft heart-nest. */
export function Logo({ size = 40, withWordmark = false, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cn-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="oklch(0.72 0.18 286)" />
            <stop offset="100%" stopColor="oklch(0.55 0.20 280)" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#cn-grad)" />
        <path
          d="M24 35c-7-4.2-11-8.1-11-13a6 6 0 0 1 11-3.3A6 6 0 0 1 35 22c0 4.9-4 8.8-11 13Z"
          fill="white"
          fillOpacity="0.95"
        />
        <circle cx="18.5" cy="18.5" r="1.4" fill="oklch(0.55 0.20 280)" />
        <circle cx="29.5" cy="18.5" r="1.4" fill="oklch(0.55 0.20 280)" />
      </svg>
      {withWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-2xl font-extrabold tracking-tight text-foreground">
            CareNest
          </span>
          <span className="text-xs font-medium text-muted-foreground mt-0.5">
            Care, together
          </span>
        </div>
      )}
    </div>
  );
}
