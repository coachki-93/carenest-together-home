import { cn } from "@/lib/utils";
import logoAsset from "@/assets/carenest-icon.png.asset.json";

interface LogoProps {
  /** Height of the logo in pixels. */
  size?: number;
  /**
   * When true the icon is rendered larger so it fills the same vertical
   * footprint the old icon + wordmark pair used to occupy.
   */
  withWordmark?: boolean;
  className?: string;
}

/** CareNest brand mark (CDN-hosted artwork). */
export function Logo({ size = 40, withWordmark = false, className }: LogoProps) {
  const height = withWordmark ? Math.round(size * 1.25) : size;
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={logoAsset.url}
        alt="CareNest"
        width={height}
        height={height}
        style={{ height, width: height }}
        className="select-none object-contain"
        draggable={false}
      />
    </div>
  );
}


