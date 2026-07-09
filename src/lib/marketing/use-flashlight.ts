import { useEffect, useRef } from "react";

/**
 * Mouse-following radial highlight on cards. Desktop-hover only; no-ops on
 * touch/coarse pointers and when `prefers-reduced-motion: reduce` is set.
 * Pairs with the `.mk-flashlight` CSS utility, which reads `--mx`/`--my`.
 */
export function useFlashlight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const hoverMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!hoverMq.matches || reducedMq.matches) return;
    let raf = 0;
    let lastX = 0;
    let lastY = 0;
    const onMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${lastX - rect.left}px`);
        el.style.setProperty("--my", `${lastY - rect.top}px`);
      });
    };
    el.addEventListener("mousemove", onMove);
    return () => {
      el.removeEventListener("mousemove", onMove);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}
