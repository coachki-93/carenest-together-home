import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/notify";
import { isPaused } from "@/lib/hospital/paused";
import { useFamily } from "@/lib/data/family";
import { useActiveOxygenTank, useConfirmTank } from "@/lib/data/oxygen";
import { isOxygenCheckOverdue } from "@/lib/oxygen/check-reminder";
import { formatFlow } from "@/lib/oxygen/tanks";

interface Props {
  familyId: string | undefined | null;
}

/**
 * In-app twin of the Stage-2 push reminder. Deliberately imports the SAME
 * pure decision function the sweep uses (`shouldSendCheckReminder`) and the
 * SAME confirm mutation (`useConfirmTank`), so banner and push can never
 * disagree and one confirm clears both.
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
  if (tank.paused_at) return null;
  if (isPaused(family ?? null, "oxygen")) return null;

  // Persistent overdue state — intentionally NOT the push's deduped predicate,
  // so the banner still shows after the push has fired.
  const due = isOxygenCheckOverdue({
    startedAt: tank.started_at,
    lastCheckedAt: tank.last_checked_at,
    intervalMinutes: family?.oxygen_check_interval_minutes,
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
