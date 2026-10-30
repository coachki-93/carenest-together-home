import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Pause, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/notify";
import { isPaused } from "@/lib/hospital/paused";
import { useFamily } from "@/lib/data/family";
import {
  useActiveOxygenTank,
  useConfirmTank,
  useResumeTank,
  type OxygenTank,
} from "@/lib/data/oxygen";
import { isOxygenCheckOverdue } from "@/lib/oxygen/check-reminder";
import { durationMinutes, formatFlow, type TankType } from "@/lib/oxygen/tanks";
import { formatTimeIn } from "@/lib/time/family-tz";

interface Props {
  familyId: string | undefined | null;
}

type FamilySettings =
  | { timezone?: string | null; oxygen_check_interval_minutes?: number | null }
  | null
  | undefined;

/**
 * In-app twin of the sweep's oxygen reminders. Deliberately imports the SAME
 * pure decision functions the sweep uses and the SAME confirm mutation
 * (`useConfirmTank`), so banner and push can never disagree and one confirm
 * clears both.
 *
 * Two states:
 *  - running tank, check overdue → amber "check the tank" banner
 *  - manually paused tank → calm persistent banner until resumed; turns amber
 *    (with a "still off?" confirm) once the check interval has passed
 */
export function OxygenCheckBanner({ familyId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: tank } = useActiveOxygenTank(familyId);
  const { data: family } = useFamily(familyId);
  const confirm = useConfirmTank();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!familyId || !tank) return null;
  if (isPaused(family ?? null, "oxygen")) return null;

  // Paused tank: hospital-paused stays silent (hospital mode UI covers it);
  // manually paused gets its own persistent banner.
  if (tank.paused_at) {
    if (tank.pause_reason !== "manual") return null;
    return <PausedTankBanner tank={tank} family={family} now={now} />;
  }

  // Persistent overdue state — intentionally NOT the push's deduped predicate,
  // so the banner still shows after the push has fired.
  const due = isOxygenCheckOverdue({
    startedAt: tank.started_at,
    lastCheckedAt: tank.last_checked_at,
    intervalMinutes: family?.oxygen_check_interval_minutes,
    tankTotalMinutes: durationMinutes(tank.tank_type as TankType, Number(tank.flow_lpm)),
    now,
  });
  if (!due) return null;

  async function handleConfirm() {
    if (!tank) return;
    try {
      await confirm.mutateAsync({ tankId: tank.id });
      toast.success(t("oxygen.confirmed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("oxygen.saveError"));
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate({ to: "/oxygen" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate({ to: "/oxygen" });
        }
      }}
      className="w-full text-left rounded-2xl border border-amber-300 bg-amber-50 p-4 md:p-5 shadow-sm cursor-pointer transition-colors hover:bg-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Wind className="size-5" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-extrabold text-amber-900">
            {t("oxygen.checkBannerTitle")}
          </h3>
          <p className="text-sm text-amber-800 mt-0.5">{t("oxygen.checkBannerBody")}</p>
          <p className="text-xs text-amber-700 mt-1 tabular-nums">
            {t("oxygen.basedOnFlow", { flow: formatFlow(Number(tank.flow_lpm)) })}
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full shrink-0"
          disabled={confirm.isPending}
          onClick={(e) => {
            e.stopPropagation();
            void handleConfirm();
          }}
        >
          {t("oxygen.confirmTank")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Persistent banner for a manually paused tank. Neutral while inside the
 * check interval; amber with a "still off?" confirm (which stamps
 * last_checked_at and resets both the banner and the push clock) once the
 * interval has passed. Never times out — only Resume or Replace clears it.
 */
function PausedTankBanner({
  tank,
  family,
  now,
}: {
  tank: OxygenTank;
  family: FamilySettings;
  now: Date;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resume = useResumeTank();
  const confirm = useConfirmTank();

  const overdue = isOxygenCheckOverdue({
    startedAt: tank.paused_at,
    lastCheckedAt: tank.last_checked_at,
    intervalMinutes: family?.oxygen_check_interval_minutes,
    tankTotalMinutes: null,
    now,
  });

  const since = formatTimeIn(tank.paused_at!, family?.timezone ?? "Europe/Stockholm");

  async function handleResume() {
    try {
      await resume.mutateAsync({ tankId: tank.id });
      toast.success(t("oxygen.resumed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("oxygen.saveError"));
    }
  }

  async function handleConfirm() {
    try {
      await confirm.mutateAsync({ tankId: tank.id });
      toast.success(t("oxygen.confirmed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("oxygen.saveError"));
    }
  }

  const go = () => navigate({ to: "/oxygen" });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
      className={
        overdue
          ? "w-full text-left rounded-2xl border border-amber-300 bg-amber-50 p-4 md:p-5 shadow-sm cursor-pointer transition-colors hover:bg-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          : "w-full text-left rounded-2xl border bg-card p-4 md:p-5 shadow-sm cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            overdue
              ? "size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"
              : "size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0"
          }
        >
          <Pause className="size-5" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className={`text-base md:text-lg font-extrabold ${overdue ? "text-amber-900" : ""}`}
          >
            {t("oxygen.pausedBannerTitle", { time: since })}
          </h3>
          <p className={`text-sm mt-0.5 ${overdue ? "text-amber-800" : "text-muted-foreground"}`}>
            {t("oxygen.pausedManualHint")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {overdue && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={confirm.isPending}
              onClick={(e) => {
                e.stopPropagation();
                void handleConfirm();
              }}
            >
              {t("oxygen.stillOff")}
            </Button>
          )}
          <Button
            size="sm"
            className="rounded-full"
            disabled={resume.isPending}
            onClick={(e) => {
              e.stopPropagation();
              void handleResume();
            }}
          >
            {t("oxygen.resumeTank")}
          </Button>
        </div>
      </div>
    </div>
  );
}
