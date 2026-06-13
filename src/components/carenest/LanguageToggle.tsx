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

const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
] as const;

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  // Defer client-only language state until after mount to avoid SSR hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = LANGS.find((l) => i18n.language?.startsWith(l.code)) ?? LANGS[0];

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
            onClick={() => i18n.changeLanguage(l.code)}
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
