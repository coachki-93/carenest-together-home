import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Globe2, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/lib/notify";
import { useFamily, useUpdateFamilyLocale } from "@/lib/data/family";

const DEFAULT_TZ = "Europe/Stockholm";

// Common fallback zones (used when Intl.supportedValuesOf is unavailable).
const FALLBACK_ZONES = [
  "UTC",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Helsinki",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Warsaw",
  "Europe/Athens",
  "Europe/Istanbul",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

function getTimeZones(): string[] {
  try {
    const anyIntl = Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    };
    if (typeof anyIntl.supportedValuesOf === "function") {
      const zones = anyIntl.supportedValuesOf("timeZone");
      if (Array.isArray(zones) && zones.length > 0) return zones;
    }
  } catch {
    // ignore
  }
  return FALLBACK_ZONES;
}

function isValidTz(tz: string, zones: string[]): boolean {
  if (zones.includes(tz)) return true;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

interface Props {
  familyId: string | undefined | null;
  isOwner: boolean;
}

export function FamilyLocaleSettings({ familyId, isOwner }: Props) {
  const { t } = useTranslation();
  const { data: family } = useFamily(familyId);
  const update = useUpdateFamilyLocale();

  const zones = useMemo(() => getTimeZones(), []);
  const [tzOpen, setTzOpen] = useState(false);

  const currentTz = family?.timezone ?? DEFAULT_TZ;
  const currentLang = (family?.notification_language ?? "sv") as "en" | "sv";

  async function pickTz(tz: string) {
    if (!familyId) return;
    if (!isValidTz(tz, zones)) {
      toast.error(t("familyLocale.invalidTz"));
      return;
    }
    setTzOpen(false);
    try {
      await update.mutateAsync({ familyId, timezone: tz });
      toast.success(t("familyLocale.tzSaved"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function pickLang(lang: "en" | "sv") {
    if (!familyId) return;
    try {
      await update.mutateAsync({ familyId, notificationLanguage: lang });
      toast.success(t("familyLocale.langSaved"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="card-soft p-6 md:p-8 space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <Globe2 className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t("familyLocale.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("familyLocale.subtitle")}
          </p>
        </div>
      </header>

      {!isOwner && (
        <p className="text-sm text-muted-foreground rounded-lg bg-muted p-3">
          {t("familyLocale.ownerOnly")}
        </p>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          {t("familyLocale.timezone")}
        </Label>
        <Popover open={tzOpen} onOpenChange={setTzOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={tzOpen}
              disabled={!isOwner || update.isPending}
              className="w-full justify-between rounded-xl h-11 font-mono"
            >
              {currentTz}
              <ChevronsUpDown className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width]"
            align="start"
          >
            <Command>
              <CommandInput placeholder={t("familyLocale.tzSearch")} />
              <CommandList>
                <CommandEmpty>{t("familyLocale.tzNoMatch")}</CommandEmpty>
                <CommandGroup>
                  {zones.map((tz) => (
                    <CommandItem
                      key={tz}
                      value={tz}
                      onSelect={() => pickTz(tz)}
                      className="font-mono"
                    >
                      <Check
                        className={cn(
                          "size-4",
                          currentTz === tz ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {tz}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-[11px] text-muted-foreground">
          {t("familyLocale.tzHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Languages className="size-4" />
          {t("familyLocale.notificationLanguage")}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!isOwner || update.isPending}
            onClick={() => pickLang("en")}
            className={cn(
              "rounded-xl border-2 p-4 text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
              currentLang === "en"
                ? "border-primary bg-primary-soft"
                : "border-border hover:border-primary/40",
            )}
          >
            <div className="text-2xl">🇬🇧</div>
            <div className="font-semibold mt-1">English</div>
          </button>
          <button
            type="button"
            disabled={!isOwner || update.isPending}
            onClick={() => pickLang("sv")}
            className={cn(
              "rounded-xl border-2 p-4 text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
              currentLang === "sv"
                ? "border-primary bg-primary-soft"
                : "border-border hover:border-primary/40",
            )}
          >
            <div className="text-2xl">🇸🇪</div>
            <div className="font-semibold mt-1">Svenska</div>
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t("familyLocale.langHint")}
        </p>
      </div>
    </section>
  );
}
