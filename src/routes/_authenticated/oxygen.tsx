import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Wind, Plus, RefreshCw, Sliders, Loader2, Hospital } from "lucide-react";
import { toast } from "@/lib/notify";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyMembership, useSession } from "@/lib/auth/use-profile";
import {
  useActiveOxygenTank,
  useOxygenHistory,
  useStartTank,
  useReplaceTank,
  useChangeFlow,
  type OxygenTank,
} from "@/lib/data/oxygen";
import {
  TANKS,
  flowOptions,
  durationMinutes,
  formatDuration,
  formatFlow,
  computeRemaining,
  type TankType,
} from "@/lib/oxygen/tanks";

export const Route = createFileRoute("/_authenticated/oxygen")({
  head: () => ({ meta: [{ title: "Oxygen — CareNest" }] }),
  component: OxygenPage,
});

const DEFAULT_TANK: TankType = "liv_mini_2l";

function OxygenPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id;
  const { data: active, isLoading } = useActiveOxygenTank(familyId);
  const { data: history } = useOxygenHistory(familyId);

  const [startOpen, setStartOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);

  // Live tick — re-render every 30s so the countdown moves
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  if (!familyId) {
    return (
      <DashboardLayout title={t("oxygen.title")} subtitle={t("oxygen.subtitle")}>
        <div className="card-soft p-10 text-center text-muted-foreground max-w-xl mx-auto">
          {t("oxygen.noFamily")}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={t("oxygen.title")}
      subtitle={t("oxygen.subtitle")}
      actions={
        active ? null : (
          <Button onClick={() => setStartOpen(true)} className="rounded-full h-11 px-5 font-semibold">
            <Plus className="size-4" /> {t("oxygen.startTank")}
          </Button>
        )
      }
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {isLoading ? (
          <div className="card-soft p-10 text-center text-muted-foreground">…</div>
        ) : active ? (
          <CurrentTankCard
            tank={active}
            onReplace={() => setReplaceOpen(true)}
            onChangeFlow={() => setChangeOpen(true)}
          />
        ) : (
          <EmptyState onStart={() => setStartOpen(true)} />
        )}

        {history && history.length > 0 && <HistoryCard items={history} />}
      </div>

      <StartTankDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        familyId={familyId}
        userId={user?.id ?? null}
      />
      {active && (
        <>
          <ReplaceTankDialog
            open={replaceOpen}
            onOpenChange={setReplaceOpen}
            tank={active}
            userId={user?.id ?? null}
          />
          <ChangeFlowDialog
            open={changeOpen}
            onOpenChange={setChangeOpen}
            tank={active}
            userId={user?.id ?? null}
          />
        </>
      )}
    </DashboardLayout>
  );
}

function statusClass(status: string) {
  switch (status) {
    case "critical":
    case "empty":
      return "bg-destructive/10 text-destructive";
    case "low":
      return "bg-amber-100 text-amber-700";
    case "paused":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}


function CurrentTankCard({
  tank,
  onReplace,
  onChangeFlow,
}: {
  tank: OxygenTank;
  onReplace: () => void;
  onChangeFlow: () => void;
}) {
  const { t } = useTranslation();
  const info = computeRemaining(tank);
  const tankLabel = TANKS[tank.tank_type as TankType]?.label ?? tank.tank_type;

  return (
    <div className="card-soft p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
            <Wind className="size-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("oxygen.currentTank")}</p>
            <h2 className="text-xl font-extrabold">{tankLabel}</h2>
          </div>
        </div>
        {info && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusClass(info.status)}`}
          >
            {t(`oxygen.status.${info.status}` as const)}
          </span>
        )}
      </div>

      {info ? (
        <>
          {info.paused && (
            <div className="card-soft p-3 flex items-center gap-3 border border-red-200 bg-red-50 text-red-900">
              <Hospital className="size-5 shrink-0" />
              <p className="text-sm font-medium">{t("oxygen.pausedHospital")}</p>
            </div>
          )}
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">{t("oxygen.timeRemaining")}</p>
            <p className="text-5xl font-extrabold tracking-tight tabular-nums">
              {formatDuration(info.remainingMinutes)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("oxygen.percentLeft", { percent: Math.round(info.percentRemaining) })}
            </p>
          </div>

          <Progress value={info.percentRemaining} className="h-3 rounded-full" />

          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <Stat label={t("oxygen.flowRate")} value={formatFlow(Number(tank.flow_lpm))} />
            <Stat label={t("oxygen.startedAt")} value={format(new Date(tank.started_at), "MMM d, HH:mm")} />
            <Stat label={t("oxygen.estimatedEmpty")} value={info.paused ? "—" : format(info.emptyAt, "MMM d, HH:mm")} />
          </div>
        </>
      ) : (
        <p className="text-sm text-destructive">Unknown flow setting.</p>
      )}


      <div className="flex flex-wrap gap-3 pt-2">
        <Button variant="outline" onClick={onChangeFlow} className="rounded-full">
          <Sliders className="size-4" /> {t("oxygen.changeFlow")}
        </Button>
        <Button onClick={onReplace} className="rounded-full">
          <RefreshCw className="size-4" /> {t("oxygen.replaceTank")}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="card-soft p-10 text-center">
      <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
        <Wind className="size-7" />
      </div>
      <h2 className="text-2xl font-extrabold mb-2">{t("oxygen.emptyTitle")}</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t("oxygen.emptyBody")}</p>
      <Button onClick={onStart} className="rounded-full h-12 px-6 font-semibold">
        <Plus className="size-4" /> {t("oxygen.startTank")}
      </Button>
    </div>
  );
}

function HistoryCard({ items }: { items: OxygenTank[] }) {
  const { t } = useTranslation();
  return (
    <div className="card-soft p-6">
      <h3 className="font-bold mb-4">{t("oxygen.history")}</h3>
      <ul className="divide-y">
        {items.map((it) => (
          <li key={it.id} className="py-3 flex justify-between text-sm">
            <span>
              {format(new Date(it.started_at), "MMM d, HH:mm")}
              {it.replaced_at && ` → ${format(new Date(it.replaced_at), "MMM d, HH:mm")}`}
            </span>
            <span className="text-muted-foreground tabular-nums">{formatFlow(Number(it.flow_lpm))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlowSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const opts = flowOptions(DEFAULT_TANK);
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="h-12 rounded-xl">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opts.map((f) => {
          const mins = durationMinutes(DEFAULT_TANK, f);
          return (
            <SelectItem key={f} value={String(f)}>
              {formatFlow(f)} · {mins ? formatDuration(mins) : ""}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function StartTankDialog({
  open,
  onOpenChange,
  familyId,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  familyId: string;
  userId: string | null;
}) {
  const { t } = useTranslation();
  const [flow, setFlow] = useState(0.05);
  const [notes, setNotes] = useState("");
  const start = useStartTank();

  async function submit() {
    try {
      await start.mutateAsync({
        family_id: familyId,
        tank_type: DEFAULT_TANK,
        flow_lpm: flow,
        notes: notes || null,
        created_by: userId,
      });
      toast.success(t("oxygen.saved"));
      onOpenChange(false);
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("oxygen.saveError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("oxygen.startTitle")}</DialogTitle>
          <DialogDescription>{t("oxygen.startBody")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("oxygen.flow")}</Label>
            <FlowSelect value={flow} onChange={setFlow} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("oxygen.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-xl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
            {t("oxygen.cancel")}
          </Button>
          <Button onClick={submit} disabled={start.isPending} className="rounded-full">
            {start.isPending && <Loader2 className="size-4 animate-spin" />}
            {start.isPending ? t("oxygen.saving") : t("oxygen.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceTankDialog({
  open,
  onOpenChange,
  tank,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tank: OxygenTank;
  userId: string | null;
}) {
  const { t } = useTranslation();
  const [flow, setFlow] = useState(Number(tank.flow_lpm));
  const [notes, setNotes] = useState("");
  const replace = useReplaceTank();

  useEffect(() => {
    if (open) {
      setFlow(Number(tank.flow_lpm));
      setNotes("");
    }
  }, [open, tank.flow_lpm]);

  async function submit() {
    try {
      await replace.mutateAsync({
        current: tank,
        flow_lpm: flow,
        notes: notes || null,
        created_by: userId,
      });
      toast.success(t("oxygen.saved"));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("oxygen.saveError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("oxygen.replaceTitle")}</DialogTitle>
          <DialogDescription>{t("oxygen.replaceBody")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("oxygen.flow")}</Label>
            <FlowSelect value={flow} onChange={setFlow} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("oxygen.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-xl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
            {t("oxygen.cancel")}
          </Button>
          <Button onClick={submit} disabled={replace.isPending} className="rounded-full">
            {replace.isPending && <Loader2 className="size-4 animate-spin" />}
            {replace.isPending ? t("oxygen.saving") : t("oxygen.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeFlowDialog({
  open,
  onOpenChange,
  tank,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tank: OxygenTank;
  userId: string | null;
}) {
  const { t } = useTranslation();
  const [flow, setFlow] = useState(Number(tank.flow_lpm));
  const change = useChangeFlow();

  useEffect(() => {
    if (open) setFlow(Number(tank.flow_lpm));
  }, [open, tank.flow_lpm]);

  async function submit() {
    try {
      await change.mutateAsync({ current: tank, new_flow_lpm: flow, created_by: userId });
      toast.success(t("oxygen.saved"));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("oxygen.saveError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("oxygen.changeFlowTitle")}</DialogTitle>
          <DialogDescription>{t("oxygen.changeFlowBody")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("oxygen.flowFromTo", { from: Number(tank.flow_lpm).toFixed(2).replace(".", ","), to: flow.toFixed(2).replace(".", ",") })}
          </p>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("oxygen.flow")}</Label>
            <FlowSelect value={flow} onChange={setFlow} />
          </div>
          <ChangeFlowPreview tank={tank} newFlow={flow} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
            {t("oxygen.cancel")}
          </Button>
          <Button onClick={submit} disabled={change.isPending} className="rounded-full">
            {change.isPending && <Loader2 className="size-4 animate-spin" />}
            {change.isPending ? t("oxygen.saving") : t("oxygen.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeFlowPreview({ tank, newFlow }: { tank: OxygenTank; newFlow: number }) {
  const { t } = useTranslation();
  const info = computeRemaining(tank);
  const newTotal = durationMinutes(tank.tank_type as TankType, newFlow);
  if (!info || newTotal == null) return null;
  const pct = info.percentRemaining / 100;
  const newRemaining = Math.min(newTotal, Math.max(0, pct * newTotal));
  const newEmptyAt = new Date(Date.now() + newRemaining * 60000);
  const percentLabel = Math.round(info.percentRemaining);

  return (
    <div className="rounded-xl border bg-muted/40 p-4 space-y-3 text-sm">
      <p className="font-semibold">{t("oxygen.changeFlowPreviewTitle")}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("oxygen.changeFlowCurrent")}</p>
          <p className="font-semibold tabular-nums">{formatFlow(Number(tank.flow_lpm))}</p>
          <p className="text-muted-foreground tabular-nums">{formatDuration(info.remainingMinutes)} · {percentLabel}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("oxygen.changeFlowAfter")}</p>
          <p className="font-semibold tabular-nums">{formatFlow(newFlow)}</p>
          <p className="text-muted-foreground tabular-nums">{formatDuration(newRemaining)} · {percentLabel}%</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("oxygen.changeFlowCarried", { percent: percentLabel })}</p>
      <p className="text-xs">
        <span className="text-muted-foreground">{t("oxygen.changeFlowNewEmpty")}: </span>
        <span className="font-semibold tabular-nums">{format(newEmptyAt, "MMM d, HH:mm")}</span>
      </p>
    </div>
  );
}
