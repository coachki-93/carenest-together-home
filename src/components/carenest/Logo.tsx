import { cn } from "@/lib/utils";
import logoAsset from "@/assets/carenest-logo.png.asset.json";

interface LogoProps {
  /** Height of the logo in pixels. */
  size?: number;
  /**
   * Kept for backwards compatibility. The uploaded artwork already includes
   * the "CareNest" wordmark, so this prop now only nudges the rendered size
   * upward for spots that previously showed the mark + wordmark pair.
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
