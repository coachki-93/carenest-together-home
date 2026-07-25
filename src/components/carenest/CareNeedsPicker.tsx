import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CareNeeds } from "@/lib/care-needs/parse";
import {
  CARE_NEED_CATEGORIES,
  capabilitiesByCategory,
  type CareNeedCategory,
} from "@/lib/care-needs/catalog";

interface Props {
  value: CareNeeds;
  onChange: (next: CareNeeds) => void;
  canEdit: boolean;
}

export function CareNeedsPicker({ value, onChange, canEdit }: Props) {
  const { t } = useTranslation();
  const selected = useMemo(() => new Set(value.capabilities), [value.capabilities]);

  // Categories start open when they have selections (progressive disclosure
  // that still surfaces existing state on load).
  const initialOpen = useMemo(() => {
    const map: Record<CareNeedCategory, boolean> = {
      airways: false, feeding: false, neurological: false, metabolic: false,
      mobility: false, continence: false, adl: false, other: false,
    };
    for (const cat of CARE_NEED_CATEGORIES) {
      map[cat] = capabilitiesByCategory(cat).some((c) => selected.has(c.key));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [open, setOpen] = useState<Record<CareNeedCategory, boolean>>(initialOpen);

  function toggle(key: string) {
    if (!canEdit) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const patch: CareNeeds = { ...value, capabilities: Array.from(next) };
    // If "other" was just deselected, drop the free-text tail.
    if (!next.has("other")) delete patch.capabilitiesOther;
    onChange(patch);
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold">{t("careNeeds.title")}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("careNeeds.subtitle")}
        </p>
      </div>

      <div className="space-y-2">
        {CARE_NEED_CATEGORIES.map((cat) => {
          const caps = capabilitiesByCategory(cat);
          const total = caps.length;
          const sel = caps.filter((c) => selected.has(c.key)).length;
          const isOpen = open[cat];
          return (
            <div key={cat} className="rounded-xl border border-border/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [cat]: !o[cat] }))}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 text-left"
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-sm">
                  {t(`careNeeds.categories.${cat}`)}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs font-semibold rounded-full px-2 py-0.5",
                      sel > 0
                        ? "bg-primary-soft text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t("careNeeds.countBadge", { selected: sel, total })}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {caps.map((cap) => {
                      const Icon = cap.icon;
                      const on = selected.has(cap.key);
                      return (
                        <button
                          key={cap.key}
                          type="button"
                          onClick={() => toggle(cap.key)}
                          disabled={!canEdit}
                          title={t(`careNeeds.capabilities.${cap.key}.desc`)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                            on
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border/60 hover:bg-muted",
                            !canEdit && "opacity-70 cursor-not-allowed",
                          )}
                          aria-pressed={on}
                        >
                          <Icon className="size-3.5" />
                          {t(`careNeeds.capabilities.${cap.key}.label`)}
                        </button>
                      );
                    })}
                  </div>

                  {cat === "other" && selected.has("other") && (
                    <Textarea
                      value={value.capabilitiesOther ?? ""}
                      onChange={(e) =>
                        onChange({ ...value, capabilitiesOther: e.target.value })
                      }
                      placeholder={t("careNeeds.otherPlaceholder")}
                      rows={3}
                      className="rounded-xl"
                      disabled={!canEdit}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
