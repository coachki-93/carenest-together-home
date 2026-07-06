import { createIsomorphicFn } from "@tanstack/react-start";
import { resolveClientLanguage } from "./index";
import { resolveLanguageServer } from "./resolve.server";
import type { Lang } from "./cookie";
import i18n from "./index";

/** Resolve the current language for use inside route head() functions.
 *  Falls back to i18next's current language on the client after first paint. */
export const resolveHeadLanguage = createIsomorphicFn()
  .client((): Lang => {
    const cur = i18n.language;
    if (cur === "en" || cur === "sv") return cur;
    return resolveClientLanguage();
  })
  .server((): Lang => resolveLanguageServer());

export const OG_LOCALE: Record<Lang, string> = {
  en: "en_US",
  sv: "sv_SE",
};
