import { cn } from "@/lib/utils";
import logoAsset from "@/assets/carenest-logo.png.asset.json";
import iconAsset from "@/assets/carenest-icon-only.png.asset.json";

interface LogoProps {
  /** Rendered height of the logo in pixels; width follows the natural aspect. */
  size?: number;
  /**
   * Kept for backward compatibility; the full Tillsa lockup already
   * includes the wordmark, so this prop no longer changes rendering.
   */
  withWordmark?: boolean;
  /** Render the square icon glyph instead of the horizontal lockup. */
  iconOnly?: boolean;
  className?: string;
}

/** Tillsa brand mark (CDN-hosted artwork). */
export function Logo({ size = 40, iconOnly = false, className }: LogoProps) {
  const src = iconOnly ? iconAsset.url : logoAsset.url;
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={src}
        alt="Tillsa"
        height={size}
        width="auto"
        style={{ height: size, width: "auto" }}
        className="select-none"
        draggable={false}
      />
    </div>
  );
}
