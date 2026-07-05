import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { DashboardLayout } from "@/components/carenest/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useMyMembership, useSession } from "@/lib/auth/use-profile";

import {
  useMachines,
  useMaintenanceItems,
  useUpsertMachine,
  useDeleteMachine,
  useUpsertMaintenanceItem,
  useDeleteMaintenanceItem,
  useMarkMaintenanceDone,
  useMaintenanceHistory,
  maintenanceStatus,
  nextDueAt,
  MACHINE_TYPE_PRESETS,
  MACHINE_SUBTYPE_PRESETS,
  isSubtypePreset,
  MAINTENANCE_ACTION_PRESETS,
  isActionPreset,
  type Machine,
  type MaintenanceItem,
  type MachineTypePreset,
  type MaintenanceScope,
} from "@/lib/data/maintenance";
import { useCaregiverProfiles } from "@/lib/data/caregiver-profiles";
import { guardActingProfile, useCurrentActor } from "@/lib/data/current-actor";
import { ByProfile } from "@/components/carenest/ByProfile";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({ meta: [{ title: "Underhåll — CareNest" }] }),
  component: MaintenancePage,
});

function isPreset(v: string): v is MachineTypePreset {
  return (MACHINE_TYPE_PRESETS as readonly string[]).includes(v);
}

function MaintenancePage() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const { data: membership } = useMyMembership();
  const familyId = membership?.family_id ?? null;
  const canManage =
    membership?.role === "owner" || membership?.material_responsible === true;

  const { data: machines = [] } = useMachines(familyId);
  const { data: items = [] } = useMaintenanceItems(familyId);
  const { data: members = [] } = useFamilyMembers(familyId);



  const itemsByMachine = useMemo(() => {
    const map = new Map<string, MaintenanceItem[]>();
    for (const it of items) {
      const list = map.get(it.machine_id) ?? [];
      list.push(it);
      map.set(it.machine_id, list);
    }
    return map;
  }, [items]);

  const [machineDialog, setMachineDialog] = useState<{
    open: boolean;
    machine: Machine | null;
  }>({ open: false, machine: null });
  const [itemDialog, setItemDialog] = useState<{
    open: boolean;
    machineId: string | null;
    item: MaintenanceItem | null;
  }>({ open: false, machineId: null, item: null });
  const [markDialog, setMarkDialog] = useState<{
    open: boolean;
    item: MaintenanceItem | null;
  }>({ open: false, item: null });
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    item: MaintenanceItem | null;
  }>({ open: false, item: null });

  const upsertMachine = useUpsertMachine();
  const deleteMachine = useDeleteMachine();
  const upsertItem = useUpsertMaintenanceItem();
  const deleteItem = useDeleteMaintenanceItem();
  const markDone = useMarkMaintenanceDone();
  const actor = useCurrentActor(familyId);

  const locale = i18n.language === "sv" ? "sv-SE" : "en-US";
  const fmtDate = (d: Date) =>
    d.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const fmtDateTime = (d: Date) =>
    d.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  function typeLabel(mt: string) {
    if (isPreset(mt)) return t(`maintenance.type.${mt}` as const);
    return mt;
  }
  function subtypeLabel(main: string, sub: string | null | undefined) {
    if (!sub) return null;
    if (isSubtypePreset(main, sub))
      return t(`maintenance.subtype.${sub}` as const);
    return sub;
  }
  function actionLabel(a: string | null | undefined) {
    if (!a) return null;
    if (isActionPreset(a)) return t(`maintenance.action.${a}` as const);
    return a;
  }

  return (
    <DashboardLayout
      title={t("maintenance.title")}
      subtitle={t("maintenance.subtitle")}
      actions={
        canManage ? (
          <Button
            size="sm"
            className="rounded-full gap-1.5 font-semibold"
            onClick={() => setMachineDialog({ open: true, machine: null })}
          >
            <Plus className="size-4" /> {t("maintenance.addMachine")}
          </Button>
        ) : null
      }
    >
      {!canManage && (
        <div className="card-soft mb-4 p-3 text-sm text-muted-foreground border border-border/60">
          {t("maintenance.readOnly")}
        </div>
      )}

      {machines.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <Wrench className="size-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">{t("maintenance.empty")}</p>
          {canManage && (
            <Button
              onClick={() => setMachineDialog({ open: true, machine: null })}
              className="rounded-full gap-1.5"
            >
              <Plus className="size-4" /> {t("maintenance.emptyCta")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {machines.map((machine) => {
            const machineItems = itemsByMachine.get(machine.id) ?? [];
            const sorted = [...machineItems].sort((a, b) => {
              if (a.scope !== b.scope) return a.scope === "machine" ? -1 : 1;
              return a.name.localeCompare(b.name);
            });
            return (
              <section
                key={machine.id}
                className={cn(
                  "card-soft p-4 sm:p-5",
                  !machine.active && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold">{machine.name}</h2>
                      <span className="text-xs font-semibold uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {typeLabel(machine.machine_type)}
                      </span>
                      {machine.machine_subtype && (
                        <span className="text-xs font-semibold uppercase tracking-wide rounded-full bg-muted/60 px-2 py-0.5 text-muted-foreground">
                          {subtypeLabel(
                            machine.machine_type,
                            machine.machine_subtype,
                          )}
                        </span>
                      )}
                      {!machine.active && (
                        <span className="text-xs font-semibold uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          <Archive className="inline size-3 mr-1" />
                          {t("maintenance.archiveMachine")}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {[machine.manufacturer, machine.model]
                        .filter(Boolean)
                        .join(" · ")}
                      {machine.serial_number && (
                        <>
                          {(machine.manufacturer || machine.model) && " · "}
                          <span className="font-mono">
                            {machine.serial_number}
                          </span>
                        </>
                      )}
                    </div>
                    {machine.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {machine.notes}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setItemDialog({
                            open: true,
                            machineId: machine.id,
                            item: null,
                          })
                        }
                        className="rounded-full gap-1"
                      >
                        <Plus className="size-4" /> {t("maintenance.addItem")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setMachineDialog({ open: true, machine })
                        }
                        aria-label={t("maintenance.editMachine")}
                        className="rounded-full"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            await upsertMachine.mutateAsync({
                              id: machine.id,
                              active: !machine.active,
                            });
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                        aria-label={
                          machine.active
                            ? t("maintenance.archiveMachine")
                            : t("maintenance.unarchiveMachine")
                        }
                        className="rounded-full"
                      >
                        {machine.active ? (
                          <Archive className="size-4" />
                        ) : (
                          <ArchiveRestore className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              t("maintenance.confirmDeleteMachineSub", {
                                name: machine.name,
                              }),
                            )
                          )
                            return;
                          try {
                            await deleteMachine.mutateAsync(machine.id);
                            toast.success(t("maintenance.deleted"));
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                        aria-label={t("maintenance.deleteMachine")}
                        className="rounded-full text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {sorted.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground italic">
                    {canManage
                      ? t("maintenance.addItem")
                      : t("maintenance.historyEmpty")}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {sorted.map((item) => {
                      const status = maintenanceStatus(item);
                      const due = nextDueAt(item);
                      const statusStyles: Record<
                        typeof status,
                        { bg: string; label: string }
                      > = {
                        ok: {
                          bg: "bg-success/10 text-success-foreground",
                          label: t("maintenance.status.ok"),
                        },
                        due_soon: {
                          bg: "bg-warning/20 text-warning-foreground",
                          label: t("maintenance.status.dueSoon"),
                        },
                        overdue: {
                          bg: "bg-destructive/10 text-destructive",
                          label: t("maintenance.status.overdue"),
                        },
                        as_needed: {
                          bg: "bg-muted text-muted-foreground",
                          label: t("maintenance.status.asNeeded"),
                        },
                      };
                      const s = statusStyles[status];
                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "flex items-start gap-3 rounded-2xl border p-3 bg-card border-border/60",
                            !item.active && "opacity-60",
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.action_type && (
                                <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                                  {actionLabel(item.action_type)}
                                </span>
                              )}
                              <span className="font-semibold">{item.name}</span>
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5",
                                  s.bg,
                                )}
                              >
                                {s.label}
                              </span>
                              {item.scope === "machine" && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
                                  {t("maintenance.scopeMachine")}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                              {item.interval_days != null && (
                                <span>
                                  <Clock className="inline size-3 mr-0.5" />
                                  {t("maintenance.intervalDays")}:{" "}
                                  {item.interval_days}
                                </span>
                              )}
                              <span>
                                {t("maintenance.lastDone")}:{" "}
                                {item.last_done_at
                                  ? fmtDate(new Date(item.last_done_at))
                                  : t("maintenance.lastDoneNever")}
                              </span>
                              {item.last_done_at && (item.last_done_by_profile_id || item.last_done_by) && (
                                <ByProfile
                                  familyId={familyId}
                                  caregiverProfileId={item.last_done_by_profile_id}
                                  authorUserId={item.last_done_by}
                                  viewerUserId={user?.id ?? null}
                                />
                              )}
                              {due && item.interval_days != null && (
                                <span>
                                  {t("maintenance.nextDue")}: {fmtDate(due)}
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="rounded-full gap-1"
                              onClick={() =>
                                setMarkDialog({ open: true, item })
                              }
                            >
                              <CheckCircle2 className="size-4" />
                              {t("maintenance.markDone")}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full"
                              aria-label={t("maintenance.history")}
                              onClick={() =>
                                setHistoryDialog({ open: true, item })
                              }
                            >
                              <History className="size-4" />
                            </Button>
                            {canManage && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-full"
                                  aria-label={t("maintenance.editItem")}
                                  onClick={() =>
                                    setItemDialog({
                                      open: true,
                                      machineId: machine.id,
                                      item,
                                    })
                                  }
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-full text-destructive"
                                  aria-label={t("maintenance.deleteItem")}
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        t("maintenance.confirmDeleteItemSub", {
                                          name: item.name,
                                        }),
                                      )
                                    )
                                      return;
                                    try {
                                      await deleteItem.mutateAsync(item.id);
                                      toast.success(t("maintenance.deleted"));
                                    } catch (e) {
                                      toast.error((e as Error).message);
                                    }
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <MachineDialog
        state={machineDialog}
        onClose={() => setMachineDialog({ open: false, machine: null })}
        onSave={async (payload) => {
          if (!familyId || !user) return;
          try {
            if (payload.id) {
              await upsertMachine.mutateAsync({ id: payload.id, ...payload.patch });
            } else {
              await upsertMachine.mutateAsync({
                family_id: familyId,
                created_by: user.id,
                name: payload.patch.name!,
                machine_type: payload.patch.machine_type!,
                machine_subtype: payload.patch.machine_subtype ?? null,
                manufacturer: payload.patch.manufacturer ?? null,
                model: payload.patch.model ?? null,
                serial_number: payload.patch.serial_number ?? null,
                notes: payload.patch.notes ?? null,
              });
            }
            toast.success(t("maintenance.saved"));
            setMachineDialog({ open: false, machine: null });
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      <ItemDialog
        state={itemDialog}
        onClose={() =>
          setItemDialog({ open: false, machineId: null, item: null })
        }
        onSave={async (payload) => {
          if (!familyId || !user) return;
          try {
            if (payload.id) {
              await upsertItem.mutateAsync({ id: payload.id, ...payload.patch });
            } else {
              await upsertItem.mutateAsync({
                family_id: familyId,
                machine_id: itemDialog.machineId!,
                created_by: user.id,
                name: payload.patch.name!,
                scope: payload.patch.scope!,
                action_type: payload.patch.action_type ?? "replace",
                interval_days: payload.patch.interval_days ?? null,
                last_done_at: payload.patch.last_done_at ?? null,
                notes: payload.patch.notes ?? null,
              });
            }
            toast.success(t("maintenance.saved"));
            setItemDialog({ open: false, machineId: null, item: null });
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      <MarkDoneDialog
        state={markDialog}
        onClose={() => setMarkDialog({ open: false, item: null })}
        onConfirm={async (note) => {
          if (!markDialog.item) return;
          const guard = guardActingProfile(actor);
          if (guard.blocked) {
            toast.error(t("actor.selectProfilePrompt"));
            return;
          }
          try {
            await markDone.mutateAsync({
              itemId: markDialog.item.id,
              note,
              caregiverProfileId: guard.caregiverProfileId,
            });
            toast.success(t("maintenance.markDoneSuccess"));
            setMarkDialog({ open: false, item: null });
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      <HistoryDialog
        state={historyDialog}
        onClose={() => setHistoryDialog({ open: false, item: null })}
        familyId={familyId}
        viewerUserId={user?.id ?? null}
        fmtDateTime={fmtDateTime}
      />
    </DashboardLayout>
  );
}

// ---------------- Dialogs ----------------

function MachineDialog({
  state,
  onClose,
  onSave,
}: {
  state: { open: boolean; machine: Machine | null };
  onClose: () => void;
  onSave: (p: {
    id?: string;
    patch: Partial<Machine> & {
      name?: string;
      machine_type?: string;
      machine_subtype?: string | null;
    };
  }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const m = state.machine;

  const SUBTYPE_OTHER = "__other__";

  const computeInitialSubState = (mm: Machine | null) => {
    const mainRaw = mm?.machine_type ?? "respiratory";
    const mainIsPreset = isPreset(mainRaw);
    const mainSlug: MachineTypePreset = mainIsPreset
      ? (mainRaw as MachineTypePreset)
      : "other";
    const sub = mm?.machine_subtype ?? null;
    const subIsPreset = isSubtypePreset(mainSlug, sub);
    return {
      typeSel: mainSlug,
      customType: mainIsPreset ? "" : mainRaw,
      subSel: sub ? (subIsPreset ? sub : SUBTYPE_OTHER) : "",
      customSub: sub && !subIsPreset ? sub : "",
    };
  };

  const initial = computeInitialSubState(m);
  const [name, setName] = useState(m?.name ?? "");
  const [typeSel, setTypeSel] = useState<MachineTypePreset>(initial.typeSel);
  const [customType, setCustomType] = useState(initial.customType);
  const [subSel, setSubSel] = useState<string>(initial.subSel);
  const [customSub, setCustomSub] = useState<string>(initial.customSub);
  const [manufacturer, setManufacturer] = useState(m?.manufacturer ?? "");
  const [model, setModel] = useState(m?.model ?? "");
  const [serial, setSerial] = useState(m?.serial_number ?? "");
  const [notes, setNotes] = useState(m?.notes ?? "");

  // Reset on open change
  useMemo(() => {
    if (state.open) {
      setName(m?.name ?? "");
      const s = computeInitialSubState(m);
      setTypeSel(s.typeSel);
      setCustomType(s.customType);
      setSubSel(s.subSel);
      setCustomSub(s.customSub);
      setManufacturer(m?.manufacturer ?? "");
      setModel(m?.model ?? "");
      setSerial(m?.serial_number ?? "");
      setNotes(m?.notes ?? "");
    }
  }, [state.open, m]);

  const machineType =
    typeSel === "other" ? customType.trim() || "other" : typeSel;

  const subPresets = MACHINE_SUBTYPE_PRESETS[typeSel] ?? [];
  const hasSubPresets = subPresets.length > 0;

  const machineSubtype: string | null = (() => {
    if (typeSel === "other") {
      // Only free-text subtype available when main is "other"
      const v = customSub.trim();
      return v || null;
    }
    if (!subSel) return null;
    if (subSel === SUBTYPE_OTHER) {
      const v = customSub.trim();
      return v || null;
    }
    return subSel;
  })();

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {m ? t("maintenance.editMachine") : t("maintenance.addMachine")}
          </DialogTitle>
          <DialogDescription>{t("maintenance.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("maintenance.machineName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t("maintenance.machineType")}</Label>
              <Select
                value={typeSel}
                onValueChange={(v) => {
                  setTypeSel(v as MachineTypePreset);
                  // Reset subtype when main category changes
                  setSubSel("");
                  setCustomSub("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_TYPE_PRESETS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`maintenance.type.${p}` as const)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeSel === "other" && (
                <Input
                  className="mt-2"
                  placeholder={t("maintenance.machineTypeCustom")}
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                />
              )}
            </div>
            <div>
              <Label>{t("maintenance.machineSubtype")}</Label>
              {hasSubPresets ? (
                <>
                  <Select
                    value={subSel || "__none__"}
                    onValueChange={(v) =>
                      setSubSel(v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("maintenance.subtypeNone")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {t("maintenance.subtypeNone")}
                      </SelectItem>
                      {subPresets.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`maintenance.subtype.${s}` as const)}
                        </SelectItem>
                      ))}
                      <SelectItem value={SUBTYPE_OTHER}>
                        {t("maintenance.subtypeOther")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {subSel === SUBTYPE_OTHER && (
                    <Input
                      className="mt-2"
                      placeholder={t("maintenance.subtypeCustom")}
                      value={customSub}
                      onChange={(e) => setCustomSub(e.target.value)}
                    />
                  )}
                </>
              ) : (
                <Input
                  placeholder={t("maintenance.subtypeCustom")}
                  value={customSub}
                  onChange={(e) => setCustomSub(e.target.value)}
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("maintenance.manufacturer")}</Label>
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("maintenance.model")}</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>{t("maintenance.serialNumber")}</Label>
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
          </div>
          <div>
            <Label>{t("maintenance.notes")}</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            onClick={() => {
              if (!name.trim() || !machineType.trim()) return;
              onSave({
                id: m?.id,
                patch: {
                  name: name.trim(),
                  machine_type: machineType,
                  machine_subtype: machineSubtype,
                  manufacturer: manufacturer.trim() || null,
                  model: model.trim() || null,
                  serial_number: serial.trim() || null,
                  notes: notes.trim() || null,
                },
              });
            }}
          >
            {t("common.save", { defaultValue: "Save" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({
  state,
  onClose,
  onSave,
}: {
  state: {
    open: boolean;
    machineId: string | null;
    item: MaintenanceItem | null;
  };
  onClose: () => void;
  onSave: (p: {
    id?: string;
    patch: Partial<MaintenanceItem> & {
      name?: string;
      scope?: MaintenanceScope;
      interval_days?: number | null;
      last_done_at?: string | null;
      action_type?: string | null;
    };
  }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const it = state.item;

  const todayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const toDateInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const ACTION_NONE = "__none__";
  const initialActionSel = (() => {
    if (!it) return "replace"; // new items default to Replace
    if (!it.action_type) return ACTION_NONE; // legacy item with no action
    if (isActionPreset(it.action_type)) return it.action_type;
    return "other";
  })();
  const initialCustomAction =
    it && it.action_type && !isActionPreset(it.action_type)
      ? it.action_type
      : "";

  const [name, setName] = useState(it?.name ?? "");
  const [scope, setScope] = useState<MaintenanceScope>(it?.scope ?? "part");
  const [actionSel, setActionSel] = useState<string>(initialActionSel);
  const [customAction, setCustomAction] = useState<string>(initialCustomAction);
  const [asNeeded, setAsNeeded] = useState<boolean>(it?.interval_days == null);
  const [interval, setInterval] = useState<string>(
    it?.interval_days ? String(it.interval_days) : "",
  );
  const [lastDone, setLastDone] = useState<string>(
    it ? toDateInput(it.last_done_at) : todayStr(),
  );
  const [notes, setNotes] = useState(it?.notes ?? "");

  useMemo(() => {
    if (state.open) {
      setName(it?.name ?? "");
      setScope(it?.scope ?? "part");
      if (!it) {
        setActionSel("replace");
        setCustomAction("");
      } else if (!it.action_type) {
        setActionSel(ACTION_NONE);
        setCustomAction("");
      } else if (isActionPreset(it.action_type)) {
        setActionSel(it.action_type);
        setCustomAction("");
      } else {
        setActionSel("other");
        setCustomAction(it.action_type);
      }
      setAsNeeded(it?.interval_days == null);
      setInterval(it?.interval_days ? String(it.interval_days) : "");
      setLastDone(it ? toDateInput(it.last_done_at) : todayStr());
      setNotes(it?.notes ?? "");
    }
  }, [state.open, it]);

  const today = todayStr();
  // Only show the "no action" option when editing a legacy item that never had one.
  const allowNoAction = !!it && !it.action_type;

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {it ? t("maintenance.editItem") : t("maintenance.addItem")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("maintenance.itemName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("maintenance.scope")}</Label>
            <Select
              value={scope}
              onValueChange={(v) => setScope(v as MaintenanceScope)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="machine">
                  {t("maintenance.scopeMachine")}
                </SelectItem>
                <SelectItem value="part">
                  {t("maintenance.scopePart")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("maintenance.actionLabel")}</Label>
            <Select value={actionSel} onValueChange={(v) => setActionSel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowNoAction && (
                  <SelectItem value={ACTION_NONE}>
                    {t("maintenance.actionNone")}
                  </SelectItem>
                )}
                {MAINTENANCE_ACTION_PRESETS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(`maintenance.action.${a}` as const)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {actionSel === "other" && (
              <Input
                className="mt-2"
                placeholder={t("maintenance.actionCustom")}
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
              />
            )}
          </div>
          <div>
            <Label className="flex items-center gap-2 font-normal">
              <input
                type="checkbox"
                checked={asNeeded}
                onChange={(e) => setAsNeeded(e.target.checked)}
              />
              {t("maintenance.asNeeded")}
            </Label>
          </div>
          {!asNeeded && (
            <div>
              <Label>{t("maintenance.intervalDays")}</Label>
              <Input
                type="number"
                min={1}
                placeholder={t("maintenance.intervalPlaceholder")}
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("maintenance.intervalHelp")}
              </p>
            </div>
          )}
          <div>
            <Label>{t("maintenance.lastDoneOn")}</Label>
            <Input
              type="date"
              max={today}
              value={lastDone}
              onChange={(e) => {
                const v = e.target.value;
                if (v && v > today) {
                  setLastDone(today);
                } else {
                  setLastDone(v);
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("maintenance.lastDoneOnHelp")}
            </p>
          </div>
          <div>
            <Label>{t("maintenance.notes")}</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) return;
              const parsed = asNeeded
                ? null
                : Math.max(1, parseInt(interval, 10) || 0);
              if (!asNeeded && !parsed) return;
              let actionValue: string | null;
              if (actionSel === ACTION_NONE) {
                actionValue = null;
              } else if (actionSel === "other") {
                const v = customAction.trim();
                if (!v) return; // require custom text when "Other" chosen
                actionValue = v;
              } else if (!actionSel) {
                return; // required for new items
              } else {
                actionValue = actionSel;
              }
              let lastDoneIso: string | null = null;
              if (lastDone && lastDone <= today) {
                const d = new Date(`${lastDone}T12:00:00`);
                if (!Number.isNaN(d.getTime())) {
                  lastDoneIso = d.toISOString();
                }
              }
              onSave({
                id: it?.id,
                patch: {
                  name: name.trim(),
                  scope,
                  action_type: actionValue,
                  interval_days: parsed,
                  last_done_at: lastDoneIso,
                  notes: notes.trim() || null,
                },
              });
            }}
          >
            {t("common.save", { defaultValue: "Save" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkDoneDialog({
  state,
  onClose,
  onConfirm,
}: {
  state: { open: boolean; item: MaintenanceItem | null };
  onClose: () => void;
  onConfirm: (note: string | null) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  useMemo(() => {
    if (state.open) setNote("");
  }, [state.open]);

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("maintenance.markDoneTitle")}</DialogTitle>
          <DialogDescription>
            {state.item?.name} — {t("maintenance.markDoneSub")}
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
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button onClick={() => onConfirm(note.trim() || null)}>
            <CheckCircle2 className="size-4 mr-1" />
            {t("maintenance.markDone")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({
  state,
  onClose,
  familyId,
  viewerUserId,
  fmtDateTime,
}: {
  state: { open: boolean; item: MaintenanceItem | null };
  onClose: () => void;
  familyId: string | null;
  viewerUserId: string | null;
  fmtDateTime: (d: Date) => string;
}) {
  const { t } = useTranslation();
  const { data: logs = [] } = useMaintenanceHistory(state.item?.id ?? null);
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("maintenance.history")} — {state.item?.name}
          </DialogTitle>
        </DialogHeader>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {t("maintenance.historyEmpty")}
          </p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-auto">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-border/60 p-3 bg-card"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">
                    {fmtDateTime(new Date(log.performed_at))}
                  </span>
                  <ByProfile
                    familyId={familyId}
                    caregiverProfileId={log.caregiver_profile_id}
                    authorUserId={log.performed_by}
                    viewerUserId={viewerUserId}
                    className="text-muted-foreground inline-flex items-center gap-1.5"
                  />
                </div>
                {log.note && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {log.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
