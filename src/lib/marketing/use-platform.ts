import { useEffect, useState } from "react";

export type Platform = "ios" | "android" | "desktop";

/**
 * UA-based platform detection for marketing pages. Returns `null` during SSR
 * and the first client render so hydration matches; flips to the detected
 * platform on mount. Consumers should render both platforms as an equal-
 * weight default when the value is `null`, then react to the resolved value.
 */
export function usePlatform(): Platform | null {
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent || "";
    // Order matters — iPadOS 13+ reports as Mac, so check touch too.
    if (/android/i.test(ua)) setPlatform("android");
    else if (
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && "ontouchend" in document)
    )
      setPlatform("ios");
    else setPlatform("desktop");
  }, []);

  return platform;
}
