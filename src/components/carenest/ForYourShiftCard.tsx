import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, Pill, Wrench, Sparkles } from "lucide-react";
import {
  buildTodaysDoses,
  useMedications,
  useMedLogs,
} from "@/lib/data/medications";
import { useAppointments } from "@/lib/data/appointments";
import { useMaintenanceItems, nextDueAt } from "@/lib/data/maintenance";
import { getForwardShiftWindow } from "@/lib/data/handover-shift";

interface Props {
  familyId: string | undefined | null;
}

/**
 * Live "For your shift" card. Shows meds, appointments, and maintenance
 * due in the forward shift window (now → next shift boundary + 4h, capped 8h).
 * Not persisted — always recomputed from the underlying data.
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
  const { data: appts } = useAppointments(familyId, window.start, window.end);
  const { data: maintItems } = useMaintenanceItems(familyId);

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
    return buildTodaysDoses(meds, medLogs ?? [], now)
      .filter((d) => {
        if (d.scheduled_for < window.start) return false;
        if (d.scheduled_for >= window.end) return false;
        // Skip already-documented outcomes; still show pending / no log.
        if (d.log && d.log.status !== "pending") return false;
        return true;
      })
      .slice(0, 8);
  }, [meds, medLogs, now, window.start, window.end]);

  const dueAppts = useMemo(() => (appts ?? []).slice(0, 8), [appts]);

  const dueMaintenance = useMemo(() => {
    if (!maintItems) return [];
    return maintItems
      .filter((item) => item.active !== false)
      .map((item) => ({ item, due: nextDueAt(item) }))
      .filter(({ due }) => due !== null && due.getTime() <= window.end.getTime())
      .sort((a, b) => (a.due!.getTime() - b.due!.getTime()))
      .slice(0, 8);
  }, [maintItems, window.end]);

  const hasAny =
    dueMeds.length > 0 || dueAppts.length > 0 || dueMaintenance.length > 0;

  return (
    <div className="card-soft p-5 mb-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-8 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <Sparkles className="size-4" />
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

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          {t("handoverPage.forYourShift.empty")}
        </p>
      ) : (
        <div className="space-y-4">
          {dueMeds.length > 0 && (
            <Section
              icon={<Pill className="size-3.5" />}
              label={t("handoverPage.forYourShift.meds")}
            >
              {dueMeds.map((d) => (
                <li key={d.key} className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-muted-foreground w-12">
                    {timeFmt.format(d.scheduled_for)}
                  </span>
                  <span className="text-sm">
                    {d.medication.name}
                    {d.medication.dose ? ` — ${d.medication.dose}` : ""}
                  </span>
                </li>
              ))}
            </Section>
          )}

          {dueAppts.length > 0 && (
            <Section
              icon={<CalendarClock className="size-3.5" />}
              label={t("handoverPage.forYourShift.appointments")}
            >
              {dueAppts.map((a) => (
                <li key={a.id} className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-muted-foreground w-12">
                    {timeFmt.format(new Date(a.starts_at))}
                  </span>
                  <span className="text-sm">{a.title}</span>
                </li>
              ))}
            </Section>
          )}

          {dueMaintenance.length > 0 && (
            <Section
              icon={<Wrench className="size-3.5" />}
              label={t("handoverPage.forYourShift.maintenance")}
            >
              {dueMaintenance.map(({ item, due }) => {
                const overdue = due! < now;
                return (
                  <li key={item.id} className="flex items-baseline gap-2">
                    <span
                      className={
                        "font-mono text-xs w-16 " +
                        (overdue
                          ? "text-destructive font-semibold"
                          : "text-muted-foreground")
                      }
                    >
                      {overdue
                        ? t("handoverPage.forYourShift.overdue")
                        : timeFmt.format(due!)}
                    </span>
                    <span className="text-sm">
                      {item.title ?? item.action ?? t("handoverPage.forYourShift.maintenanceItem")}
                    </span>
                  </li>
                );
              })}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
        {icon}
        {label}
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}
