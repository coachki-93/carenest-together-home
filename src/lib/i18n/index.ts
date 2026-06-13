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

/** Synchronously align i18n to a known language (no async load — resources are inlined). */
export function setI18nLanguage(lang: Lang) {
  if (i18n.language !== lang) {
    // changeLanguage is synchronous for already-loaded bundled resources.
    void i18n.changeLanguage(lang);
  }
}

/** Resolve the language to use on first render. Cookie > localStorage > navigator > en. */
export function resolveClientLanguage(): Lang {
  if (typeof window === "undefined") return "en";
  const cookie = readLangCookieClient();
  if (cookie) return cookie;
  try {
    const ls = window.localStorage.getItem(I18N_STORAGE_KEY);
    if (isLang(ls)) return ls;
  } catch {
    // ignore
  }
  const nav = window.navigator?.language?.slice(0, 2);
  return nav === "sv" ? "sv" : "en";
}

export default i18n;
