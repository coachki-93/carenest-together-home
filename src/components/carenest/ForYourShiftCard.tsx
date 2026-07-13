import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Pill } from "lucide-react";
import {
  buildTodaysDoses,
  useMedications,
  useMedLogs,
} from "@/lib/data/medications";
import { useFamily } from "@/lib/data/family";
import { getForwardShiftWindow } from "@/lib/data/handover-shift";

interface Props {
  familyId: string | undefined | null;
}

/**
 * "Critical upcoming" card.
 *
 * Shows only can't-miss items due in the forward shift window
 * (now → next shift boundary + 4h, capped at 8h).
 *
 * Currently: medications only — every scheduled dose is implicitly critical.
 *
 * Future extension: appointments and maintenance items marked with an
 * `is_critical` (or similar) flag by the user will also render here.
 * Non-critical schedule items live on their own pages by design.
 */
export function ForYourShiftCard({ familyId }: Props) {
  const { t, i18n } = useTranslation();
  const now = useMemo(() => new Date(), []);
  const window = useMemo(() => getForwardShiftWindow(now), [now]);

  // Meds: fetch a day-wide window so buildTodaysDoses works, then filter.
  const dayStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);
  const dayEnd = useMemo(() => {
    const d = new Date(dayStart);
    d.setDate(d.getDate() + 1);
    return d;
  }, [dayStart]);

  const { data: meds } = useMedications(familyId);
  const { data: medLogs } = useMedLogs(familyId, dayStart, dayEnd);
  const { data: family } = useFamily(familyId);
  const tz = family?.timezone ?? "Europe/Stockholm";

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [i18n.language],
  );

  const dueMeds = useMemo(() => {
    if (!meds) return [];
    return buildTodaysDoses(meds, medLogs ?? [], tz, now)
      .filter((d) => {
        if (d.scheduled_for < window.start) return false;
        if (d.scheduled_for >= window.end) return false;
        // Skip already-documented outcomes; only show doses with no log yet.
        if (d.log) return false;
        return true;
      })
      .slice(0, 8);
  }, [meds, medLogs, tz, now, window.start, window.end]);

  // TODO: when appointments / maintenance gain an `is_critical` flag,
  // fetch and merge them here alongside meds.

  if (dueMeds.length === 0) return null;

  return (
    <div className="card-soft p-5 mb-6 max-w-3xl mx-auto border border-amber-200 bg-amber-50/40">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <AlertCircle className="size-4" />
        </div>
        <div>
          <div className="text-sm font-extrabold">
            {t("handoverPage.forYourShift.title")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("handoverPage.forYourShift.window", {
              end: timeFmt.format(window.end),
            })}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          <Pill className="size-3.5" />
          {t("handoverPage.forYourShift.meds")}
        </div>
        <ul className="space-y-1">
          {dueMeds.map((d) => (
            <li key={d.key} className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-muted-foreground w-12">
                {timeFmt.format(d.scheduled_for)}
              </span>
              <span className="text-sm">
                {d.medication.name}
                {d.medication.dose_amount != null
                  ? ` — ${d.medication.dose_amount}${d.medication.dose_unit ? ` ${d.medication.dose_unit}` : ""}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
