import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Wrench, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/notify";
import {
  useDueMaintenanceItems,
  useMarkMaintenanceDone,
  maintenanceStatus,
  isActionPreset,
  type DueMaintenanceRow,
} from "@/lib/data/maintenance";
import { cn } from "@/lib/utils";

export function MaintenanceDueCard({
  familyId,
}: {
  familyId: string | null | undefined;
}) {
  const { t } = useTranslation();
  const { data: rows = [] } = useDueMaintenanceItems(familyId);
  const [pending, setPending] = useState<DueMaintenanceRow | null>(null);
  const [note, setNote] = useState("");
  const markDone = useMarkMaintenanceDone();

  const actionText = (a: string | null | undefined) => {
    if (!a) return null;
    if (isActionPreset(a)) return t(`maintenance.action.${a}` as const);
    return a;
  };
  const taskTitle = (r: DueMaintenanceRow) => {
    const action = actionText(r.item.action_type);
    if (action) return `${action} ${r.item.name} — ${r.machine.name}`;
    return `${r.machine.name} — ${r.item.name}`;
  };

  if (rows.length === 0) return null;

  return (
    <section className="card-soft p-4 sm:p-5" data-tour="maintenance-due">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <Wrench className="size-5" />
          </div>
          <h2 className="text-lg font-bold">
            {t("maintenance.dashboard.title")}
          </h2>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-full gap-1"
        >
          <Link to="/maintenance">
            {t("maintenance.dashboard.viewAll")}
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => {
          const overdue = maintenanceStatus(r.item) === "overdue";
          return (
            <li
              key={r.item.id}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-3",
                overdue
                  ? "bg-destructive/5 border-destructive/40"
                  : "bg-warning/10 border-warning/30",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">
                    {taskTitle(r)}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5",
                      overdue
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/20 text-warning-foreground",
                    )}
                  >
                    {overdue ? (
                      <>
                        <AlertTriangle className="inline size-3 mr-0.5" />
                        {t("maintenance.status.overdue")}
                      </>
                    ) : (
                      t("maintenance.dueToday")
                    )}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full gap-1 shrink-0"
                onClick={() => {
                  setPending(r);
                  setNote("");
                }}
              >
                <CheckCircle2 className="size-4" />
                {t("maintenance.markDone")}
              </Button>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("maintenance.markDoneTitle")}</DialogTitle>
            <DialogDescription>
              {pending && taskTitle(pending)} — {t("maintenance.markDoneSub")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("maintenance.markDoneNote")}</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              onClick={async () => {
                if (!pending) return;
                try {
                  await markDone.mutateAsync({
                    itemId: pending.item.id,
                    note: note.trim() || null,
                  });
                  toast.success(t("maintenance.markDoneSuccess"));
                  setPending(null);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <CheckCircle2 className="size-4 mr-1" />
              {t("maintenance.markDone")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
