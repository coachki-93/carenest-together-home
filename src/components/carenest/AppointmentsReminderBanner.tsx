import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { BellRing, ChevronRight } from "lucide-react";
import { useAppointments } from "@/lib/data/appointments";
import { useAppointmentCompletions } from "@/lib/data/appointment-completions";
import { useFamily } from "@/lib/data/family";
import { formatTimeIn, wallClockIn } from "@/lib/time/family-tz";

interface Props {
  familyId: string | undefined | null;
}

/**
 * Surfaces upcoming visits with a `reminder_minutes` set, from
 * `starts_at - reminder_minutes` until `starts_at`. Derived at read time from
 * the visit's own reminder_minutes — independent of push dedupe.
 *
 * Excludes visits whose local day is today (existing AppointmentsTodayBanner
 * already covers those), so this is effectively the "reminder for
 * tomorrow / next few hours across midnight" surface.
 */
export function AppointmentsReminderBanner({ familyId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: family } = useFamily(familyId);
  const tz = family?.timezone ?? "Europe/Stockholm";

  // 2-day look-ahead cap matches the max reminder (1440 min = 1 day),
  // with a bit of slack for tz math across midnight.
  const start = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const end = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3);
    return d;
  }, []);

  const { data: appts = [] } = useAppointments(familyId, start, end);
  const { data: completions = [] } = useAppointmentCompletions(familyId, start, end);

  const due = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    const todayStr = wallClockIn(now, tz).todayStr;
    return appts
      .filter((a) => {
        const rm = (a as { reminder_minutes?: number | null }).reminder_minutes;
        if (!rm || rm <= 0) return false;
        if (a.all_day) return false;
        const startMs = new Date(a.starts_at).getTime();
        const remindAt = startMs - rm * 60_000;
        if (nowMs < remindAt || nowMs >= startMs) return false;
        // Skip visits happening today — covered by AppointmentsTodayBanner.
        const day = wallClockIn(new Date(a.starts_at), tz).todayStr;
        if (day === todayStr) return false;
        // Skip if already completed/skipped/postponed.
        const masterId = a.master_id ?? a.id;
        const hasCompletion = completions.some(
          (c) =>
            c.appointment_id === masterId &&
            new Date(c.occurrence_at).getTime() ===
              new Date(a.occurrence_start).getTime(),
        );
        return !hasCompletion;
      })
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
  }, [appts, completions, tz]);

  if (due.length === 0) return null;

  const first = due[0];
  const time = formatTimeIn(first.starts_at, tz);
  const todayStr = wallClockIn(new Date(), tz).todayStr;
  const firstDay = wallClockIn(new Date(first.starts_at), tz).todayStr;

  let headline: string;
  if (due.length === 1) {
    headline =
      firstDay === todayStr
        ? t("appointments.reminder_banner.singularToday", {
            title: first.title,
            time,
          })
        : t("appointments.reminder_banner.singularTomorrow", {
            title: first.title,
            time,
          });
  } else {
    headline = t("appointments.reminder_banner.plural", { count: due.length });
  }

  const accent = (first as { color?: string | null }).color ?? "#7C3AED";

  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/appointments" })}
      className="w-full text-left card-soft p-4 mb-4 flex items-center gap-4 border-2 hover:brightness-[0.98] transition"
      style={{ borderColor: accent + "88", backgroundColor: accent + "12" }}
      aria-label={headline}
    >
      <div
        className="size-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: accent + "33", color: accent }}
      >
        <BellRing className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-extrabold truncate">{headline}</h3>
      </div>
      <ChevronRight className="size-5 shrink-0 opacity-70" />
    </button>
  );
}
