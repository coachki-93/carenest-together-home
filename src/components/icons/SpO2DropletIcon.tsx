import type { ImgHTMLAttributes } from "react";
import spo2IconAsset from "@/assets/spo2-icon.png.asset.json";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  size?: number | string;
};

/**
 * SpO₂ icon — custom user-provided red droplet with white bubbles.
 */
export function SpO2DropletIcon({ size = 24, className, style, ...rest }: Props) {
  return (
    <img
      src={spo2IconAsset.url}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", ...style }}
      aria-hidden="true"
      {...rest}
    />
  );
}

export default SpO2DropletIcon;
