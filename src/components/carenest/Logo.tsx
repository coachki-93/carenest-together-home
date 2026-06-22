import { cn } from "@/lib/utils";
import logoAsset from "@/assets/carenest-icon.png.asset.json";

interface LogoProps {
  /** Height of the logo in pixels. */
  size?: number;
  /**
   * Keeps the same footprint as the old icon + wordmark pair. When true the
   * icon is rendered ~10% taller so it fills the vertical space previously
   * occupied by the "CareNest" wordmark.
   */
  withWordmark?: boolean;
  className?: string;
}

/** CareNest brand mark (CDN-hosted artwork). */
export function Logo({ size = 40, withWordmark = false, className }: LogoProps) {
  const height = withWordmark ? Math.round(size * 1.1) : size;
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={logoAsset.url}
        alt="CareNest"
        height={height}
        style={{ height, width: "auto" }}
        className="select-none"
        draggable={false}
      />
    </div>
  );
}

