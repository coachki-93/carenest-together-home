/** Shared cookie helpers for language preference (SSR + client). */
export const LANG_COOKIE = "carenest_lang";
export const SUPPORTED = ["en", "sv"] as const;
export type Lang = (typeof SUPPORTED)[number];

export function isLang(v: string | null | undefined): v is Lang {
  return v === "en" || v === "sv";
}

export function parseLangFromCookieHeader(header: string | null | undefined): Lang | null {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]+)`));
  const v = m?.[1];
  return isLang(v) ? v : null;
}

export function readLangCookieClient(): Lang | null {
  if (typeof document === "undefined") return null;
  return parseLangFromCookieHeader(document.cookie);
}

export function writeLangCookieClient(lang: Lang) {
  if (typeof document === "undefined") return;
  // 1 year, path=/, SameSite=Lax
  document.cookie = `${LANG_COOKIE}=${lang}; Max-Age=31536000; Path=/; SameSite=Lax`;
}
