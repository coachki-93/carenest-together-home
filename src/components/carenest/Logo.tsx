import { cn } from "@/lib/utils";
import logoAsset from "@/assets/carenest-logo.png.asset.json";

interface LogoProps {
  /** Height of the logo in pixels. */
  size?: number;
  className?: string;
}

/** CareNest brand mark (CDN-hosted artwork). */
export function Logo({ size = 40, className }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={logoAsset.url}
        alt="CareNest"
        width={size}
        height={size}
        style={{ height: size, width: size }}
        className="select-none object-contain"
        draggable={false}
      />
    </div>
  );
}



