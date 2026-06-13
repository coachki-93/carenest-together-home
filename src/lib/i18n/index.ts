import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { sv } from "./sv";

export const I18N_STORAGE_KEY = "carenest:lang";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, sv: { translation: sv } },
    lng: "en", // SSR & first render always EN so hydration matches
    fallbackLng: "en",
    supportedLngs: ["en", "sv"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

/** Call once on the client after mount to switch to the user's saved language. */
export function hydrateClientLanguage() {
  if (typeof window === "undefined") return;
  try {
    const saved = window.localStorage.getItem(I18N_STORAGE_KEY);
    const nav = window.navigator?.language?.slice(0, 2);
    const target = saved || (nav === "sv" ? "sv" : "en");
    if (target && target !== i18n.language) {
      void i18n.changeLanguage(target);
    }
  } catch {
    // ignore
  }
}

export default i18n;
