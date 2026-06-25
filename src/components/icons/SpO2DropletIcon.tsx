import type { ImgHTMLAttributes } from "react";
import spo2IconAsset from "@/assets/spo2-icon.png.asset.json";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  size?: number | string;
};

/**
 * SpO₂ icon — custom user-provided red droplet with white bubbles.
 * Sizing follows the className (e.g. `h-5 w-5`) so it matches the
 * surrounding Lucide icons in lists and headers.
 */
export function SpO2DropletIcon({ size, className, style, ...rest }: Props) {
  const sizeStyle =
    size !== undefined ? { width: size, height: size } : undefined;
  return (
    <img
      src={spo2IconAsset.url}
      alt=""
      className={className}
      style={{ objectFit: "contain", ...sizeStyle, ...style }}
      aria-hidden="true"
      {...rest}
    />
  );
}

export default SpO2DropletIcon;
