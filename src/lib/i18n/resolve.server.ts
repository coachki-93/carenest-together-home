import { getRequestHeader } from "@tanstack/react-start/server";
import { parseLangFromCookieHeader, type Lang } from "./cookie";

export function resolveLanguageServer(): Lang {
  try {
    const cookieHeader = getRequestHeader("cookie") ?? null;
    return parseLangFromCookieHeader(cookieHeader) ?? "en";
  } catch {
    return "en";
  }
}
