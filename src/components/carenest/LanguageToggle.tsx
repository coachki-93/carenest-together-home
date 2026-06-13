import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { I18N_STORAGE_KEY } from "@/lib/i18n";
import { writeLangCookieClient, type Lang } from "@/lib/i18n/cookie";

const LANGS = [
  { code: "en" as const, label: "English", flag: "🇬🇧" },
  { code: "sv" as const, label: "Svenska", flag: "🇸🇪" },
];

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  // Defer client-only language label until after mount to avoid SSR mismatch
  // on the trigger button text (cookies on first SSR may not match toggle paint timing).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = LANGS.find((l) => i18n.language?.startsWith(l.code)) ?? LANGS[0];

  function pick(code: Lang) {
    writeLangCookieClient(code);
    try {
      window.localStorage.setItem(I18N_STORAGE_KEY, code);
    } catch {
      // ignore
    }
    void i18n.changeLanguage(code);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className="rounded-full gap-2"
          aria-label={t("common.language")}
          suppressHydrationWarning
        >
          <Languages className="size-4" />
          {!compact && (
            <span className="text-sm font-semibold" suppressHydrationWarning>
              {mounted ? `${current.flag} ${current.code.toUpperCase()}` : "🇬🇧 EN"}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => pick(l.code)}
            className="rounded-lg cursor-pointer gap-2"
          >
            <span>{l.flag}</span>
            <span className="font-medium">{l.label}</span>
            {mounted && current.code === l.code && (
              <span className="ml-auto text-primary text-xs">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
