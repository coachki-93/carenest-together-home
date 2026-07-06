import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { sv } from "./sv";
import { isLang, readLangCookieClient, type Lang } from "./cookie";

export const I18N_STORAGE_KEY = "carenest:lang";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, sv: { translation: sv } },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "sv"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

/** Align i18n to a known language. Awaits changeLanguage so SSR/component
 *  render never runs while the language is still in flux. */
export async function setI18nLanguage(lang: Lang) {
  if (i18n.language !== lang) {
    await i18n.changeLanguage(lang);
  }
}

/** Resolve the language for the very first client paint.
 *  Prefers the cookie (matches SSR), then localStorage, then "en".
 *  The localStorage fallback keeps preferences sticky in environments
 *  where the cookie write is rejected (cross-origin preview iframe,
 *  Safari block-all-cookies, private mode). */
export function resolveClientLanguage(): Lang {
  if (typeof window === "undefined") return "en";
  const fromCookie = readLangCookieClient();
  if (fromCookie) return fromCookie;
  try {
    const ls = window.localStorage.getItem(I18N_STORAGE_KEY);
    if (isLang(ls)) return ls;
  } catch {
    // ignore
  }
  return "en";
}

/** Detect a language preference from localStorage or navigator.
 *  Safe to call after hydration — never during the initial render. */
export function detectClientLanguage(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const ls = window.localStorage.getItem(I18N_STORAGE_KEY);
    if (isLang(ls)) return ls;
  } catch {
    // ignore
  }
  const nav = window.navigator?.language?.slice(0, 2);
  return nav === "sv" ? "sv" : nav === "en" ? "en" : null;
}

export default i18n;
