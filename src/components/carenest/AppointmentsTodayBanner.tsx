import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { CalendarHeart, ChevronRight } from "lucide-react";
import { useAppointments } from "@/lib/data/appointments";
import { useAppointmentCompletions } from "@/lib/data/appointment-completions";
import { useFamily } from "@/lib/data/family";
import { formatTimeIn, wallClockIn } from "@/lib/time/family-tz";

interface Props {
  familyId: string | undefined | null;
}

/**
 * Prominent banner on Today shown when the family has one or more upcoming
 * `appointment`/`therapy` events later today (family timezone). Never marks
 * anything — tapping it navigates to /appointments.
 *
 * Gating rules (agreed with the owner):
 *  - kind IN ('appointment','therapy')
 *  - no completion recorded yet (any status)
 *  - all-day, OR starts_at is later than "now" in the family timezone
 *
 * Deliberately duplicates the Today task-list row: the banner earns its place
 * by being the top-of-page, tappable jump to /appointments with location shown.
 */
export function AppointmentsTodayBanner({ familyId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: family } = useFamily(familyId);
  const tz = family?.timezone ?? "Europe/Stockholm";

  // Widen the window slightly on each side so tz math near midnight is safe;
  // the filter below picks the actual family-timezone "today".
  const start = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 1);
    return d;
  }, []);
  const end = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 2);
    return d;
  }, []);

  const { data: appts = [] } = useAppointments(familyId, start, end);
  const { data: completions = [] } = useAppointmentCompletions(familyId, start, end);

  const upcoming = useMemo(() => {
    const now = new Date();
    const { todayStr } = wallClockIn(now, tz);
    const visits = appts.filter(
      (a) =>
        a.kind === "appointment" ||
        a.kind === "therapy" ||
        a.kind === "meeting" ||
        a.kind === "lab" ||
        a.kind === "dental" ||
        a.kind === "hospital_stay",
    );
    return visits
      .filter((a) => {
        const day = wallClockIn(new Date(a.starts_at), tz).todayStr;
        if (day !== todayStr) return false;
        // No completion for this occurrence yet
        const masterId = a.master_id ?? a.id;
        const hasCompletion = completions.some(
          (c) =>
            c.appointment_id === masterId &&
            new Date(c.occurrence_at).getTime() ===
              new Date(a.occurrence_start).getTime(),
        );
        if (hasCompletion) return false;
        // Still upcoming (or all-day)
        if (a.all_day) return true;
        return new Date(a.starts_at).getTime() >= now.getTime();
      })
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
  }, [appts, completions, tz]);

  if (upcoming.length === 0) return null;

  let headline: string;
  if (upcoming.length === 1) {
    const a = upcoming[0];
    const title = a.title;
    const location = (a.location ?? "").trim();
    const time = a.all_day
      ? t("appointments.today_banner.allDay")
      : formatTimeIn(a.starts_at, tz);
    headline = location
      ? t("appointments.today_banner.singularWithLocation", {
          title,
          location,
          time,
        })
      : t("appointments.today_banner.singularNoLocation", { title, time });
  } else {
    headline = t("appointments.today_banner.plural", { count: upcoming.length });
  }

  const accent = (upcoming[0] as { color?: string | null }).color ?? "#7C3AED";

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
        <CalendarHeart className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-extrabold truncate">{headline}</h3>
      </div>
      <ChevronRight className="size-5 shrink-0 opacity-70" />
    </button>
  );
}
