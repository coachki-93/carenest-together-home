import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// The generated types may not yet include the new `machine_subtype` column.
// We augment locally so the app compiles regardless of regeneration timing.
type MachineRow = Database["public"]["Tables"]["machines"]["Row"] & {
  machine_subtype: string | null;
};
type MachineInsertRow = Database["public"]["Tables"]["machines"]["Insert"] & {
  machine_subtype?: string | null;
};
type MachineUpdateRow = Database["public"]["Tables"]["machines"]["Update"] & {
  machine_subtype?: string | null;
};

export type Machine = MachineRow;
export type MachineInsert = MachineInsertRow;
export type MachineUpdate = MachineUpdateRow;
// Augment MaintenanceItem locally for the new `action_type` column so app code
// compiles regardless of when the generated Supabase types refresh.
type MaintenanceItemRow =
  Database["public"]["Tables"]["maintenance_items"]["Row"] & {
    action_type: string | null;
  };
type MaintenanceItemInsertRow =
  Database["public"]["Tables"]["maintenance_items"]["Insert"] & {
    action_type?: string | null;
  };
type MaintenanceItemUpdateRow =
  Database["public"]["Tables"]["maintenance_items"]["Update"] & {
    action_type?: string | null;
  };

export type MaintenanceItem = MaintenanceItemRow;
export type MaintenanceItemInsert = MaintenanceItemInsertRow;
export type MaintenanceItemUpdate = MaintenanceItemUpdateRow;
export type MaintenanceLog =
  Database["public"]["Tables"]["maintenance_logs"]["Row"];
export type MaintenanceScope = Database["public"]["Enums"]["maintenance_scope"];

/** Preset action slugs shown in the UI; DB stores free text. */
export const MAINTENANCE_ACTION_PRESETS = [
  "replace",
  "clean",
  "refill",
  "empty",
  "inspect",
  "charge",
  "calibrate_test",
  "professional_service",
  "other",
] as const;
export type MaintenanceActionPreset =
  (typeof MAINTENANCE_ACTION_PRESETS)[number];

export function isActionPreset(v: string): v is MaintenanceActionPreset {
  return (MAINTENANCE_ACTION_PRESETS as readonly string[]).includes(v);
}

/** Preset main-category slugs shown in the UI; DB stores free text. */
export const MACHINE_TYPE_PRESETS = [
  "respiratory",
  "feeding",
  "suction",
  "oxygen",
  "monitoring",
  "mobility",
  "therapy",
  "other",
] as const;
export type MachineTypePreset = (typeof MACHINE_TYPE_PRESETS)[number];

/** Preset subcategory slugs per main category. DB stores free text. */
export const MACHINE_SUBTYPE_PRESETS: Record<
  MachineTypePreset,
  readonly string[]
> = {
  respiratory: [
    "ventilator_invasive",
    "ventilator_niv_bipap",
    "cpap",
    "oxygen_concentrator",
    "cough_assist",
    "nebulizer",
    "humidifier",
    "pulse_oximeter",
  ],
  feeding: ["feeding_pump", "syringe_pump"],
  suction: ["suction_stationary", "suction_portable"],
  oxygen: [
    "oxygen_concentrator_stationary",
    "oxygen_concentrator_portable",
    "oxygen_cylinder",
    "liquid_oxygen",
  ],
  monitoring: [
    "saturation_monitor",
    "apnea_monitor",
    "heart_rate_monitor",
    "seizure_alarm",
    "baby_monitor",
    "glucose_monitor_cgm",
  ],
  mobility: [
    "wheelchair_electric",
    "wheelchair_manual",
    "patient_lift",
    "hospital_bed",
    "standing_frame",
    "pressure_mattress",
  ],
  therapy: [
    "infusion_pump",
    "tens",
    "vibration_vest",
    "wound_npwt",
    "dialysis",
  ],
  other: [],
};

export function isSubtypePreset(
  main: string,
  sub: string | null | undefined,
): boolean {
  if (!sub) return false;
  const list = (MACHINE_SUBTYPE_PRESETS as Record<string, readonly string[]>)[
    main
  ];
  return !!list && list.includes(sub);
}

export const DUE_SOON_DAYS = 7;

export type MaintenanceStatus = "ok" | "due_soon" | "overdue" | "as_needed";

/** Next-due timestamp, or null when the item has no schedule / never been done. */
export function nextDueAt(item: MaintenanceItem): Date | null {
  if (item.interval_days == null) return null;
  if (!item.last_done_at) return new Date(0); // never done → overdue
  const last = new Date(item.last_done_at);
  return new Date(last.getTime() + item.interval_days * 24 * 60 * 60 * 1000);
}

export function maintenanceStatus(
  item: MaintenanceItem,
  now: Date = new Date(),
): MaintenanceStatus {
  if (item.interval_days == null) return "as_needed";
  const due = nextDueAt(item);
  if (!due) return "overdue";
  const ms = due.getTime() - now.getTime();
  if (ms < 0) return "overdue";
  if (ms <= DUE_SOON_DAYS * 24 * 60 * 60 * 1000) return "due_soon";
  return "ok";
}

/** True when an item's next-due date is today or in the past. */
export function isDueTodayOrOverdue(
  item: MaintenanceItem,
  now: Date = new Date(),
): boolean {
  if (item.interval_days == null) return false;
  const due = nextDueAt(item);
  if (!due) return true;
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  return due.getTime() <= endOfToday.getTime();
}

// ---------------------------------------------------------------------
// Machines
// ---------------------------------------------------------------------

export function useMachines(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["maintenance-machines", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .eq("family_id", familyId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Machine[];
    },
  });
}

export function useUpsertMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input:
        | (MachineInsert & { id?: string })
        | (MachineUpdate & { id: string }),
    ) => {
      if ("id" in input && input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("machines")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("machines")
          .insert(input as MachineInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance-machines"] });
    },
  });
}

export function useDeleteMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("machines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance-machines"] });
      qc.invalidateQueries({ queryKey: ["maintenance-items"] });
      qc.invalidateQueries({ queryKey: ["maintenance-due"] });
    },
  });
}

// ---------------------------------------------------------------------
// Maintenance items
// ---------------------------------------------------------------------

export function useMaintenanceItems(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["maintenance-items", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_items")
        .select("*")
        .eq("family_id", familyId!)
        .order("scope", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data as MaintenanceItem[];
    },
  });
}

export function useUpsertMaintenanceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input:
        | (MaintenanceItemInsert & { id?: string })
        | (MaintenanceItemUpdate & { id: string }),
    ) => {
      if ("id" in input && input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("maintenance_items")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("maintenance_items")
          .insert(input as MaintenanceItemInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance-items"] });
      qc.invalidateQueries({ queryKey: ["maintenance-due"] });
    },
  });
}

export function useDeleteMaintenanceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance-items"] });
      qc.invalidateQueries({ queryKey: ["maintenance-due"] });
    },
  });
}

// ---------------------------------------------------------------------
// Mark done (atomic RPC)
// ---------------------------------------------------------------------

export function useMarkMaintenanceDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      itemId: string;
      note?: string | null;
      caregiverProfileId?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("mark_maintenance_done", {
        _item_id: input.itemId,
        _note: input.note ?? undefined,
        _caregiver_profile_id: input.caregiverProfileId ?? undefined,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance-items"] });
      qc.invalidateQueries({ queryKey: ["maintenance-history"] });
      qc.invalidateQueries({ queryKey: ["maintenance-due"] });
      qc.invalidateQueries({ queryKey: ["maintenance-machines"] });
    },
  });
}

// ---------------------------------------------------------------------
// History
// ---------------------------------------------------------------------

export function useMaintenanceHistory(
  itemId: string | undefined | null,
  limit = 20,
) {
  return useQuery({
    queryKey: ["maintenance-history", itemId, limit],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*")
        .eq("maintenance_item_id", itemId!)
        .order("performed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as MaintenanceLog[];
    },
  });
}

// ---------------------------------------------------------------------
// Dashboard "due today or overdue" query
// ---------------------------------------------------------------------

export interface DueMaintenanceRow {
  item: MaintenanceItem;
  machine: Pick<Machine, "id" | "name" | "machine_type">;
}

export function useDueMaintenanceItems(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["maintenance-due", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_items")
        .select("*, machine:machines!inner(id, name, machine_type, active)")
        .eq("family_id", familyId!)
        .eq("active", true)
        .not("interval_days", "is", null);
      if (error) throw error;
      const now = new Date();
      const rows = (data ?? []) as (MaintenanceItem & {
        machine: {
          id: string;
          name: string;
          machine_type: string;
          active: boolean;
        };
      })[];
      return rows
        .filter((r) => r.machine.active && isDueTodayOrOverdue(r, now))
        .map<DueMaintenanceRow>((r) => ({
          item: r,
          machine: {
            id: r.machine.id,
            name: r.machine.name,
            machine_type: r.machine.machine_type,
          },
        }));
    },
  });
}

// ---------------------------------------------------------------------
// Summary (reserved for future dashboard card)
// ---------------------------------------------------------------------

export function useMaintenanceSummary(familyId: string | undefined | null) {
  const { data: items = [] } = useMaintenanceItems(familyId);
  const now = new Date();
  let overdueCount = 0;
  let dueSoonCount = 0;
  for (const it of items) {
    if (!it.active) continue;
    const s = maintenanceStatus(it, now);
    if (s === "overdue") overdueCount++;
    else if (s === "due_soon") dueSoonCount++;
  }
  return { overdueCount, dueSoonCount };
}
