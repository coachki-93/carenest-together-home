import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

export type RecurrenceFreq = "hourly" | "daily" | "weekly" | "monthly";

// Extend the generated row with the recurrence columns (typegen runs after
// migration approval; we type them here so the rest of the app compiles now).
export type Appointment = AppointmentRow & {
  recurrence_freq: RecurrenceFreq | null;
  recurrence_interval: number;
  recurrence_byweekday: number[] | null;
  recurrence_parent_id: string | null;
  recurrence_override_at: string | null;
  recurrence_cancelled: boolean;
  recurrence_times_of_day: string[] | null;
  reminder_minutes: number | null;
};

export type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"] & {
  recurrence_freq?: RecurrenceFreq | null;
  recurrence_interval?: number;
  recurrence_byweekday?: number[] | null;
  recurrence_parent_id?: string | null;
  recurrence_override_at?: string | null;
  recurrence_cancelled?: boolean;
  recurrence_times_of_day?: string[] | null;
  reminder_minutes?: number | null;
};

export type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"] & {
  recurrence_freq?: RecurrenceFreq | null;
  recurrence_interval?: number;
  recurrence_byweekday?: number[] | null;
  recurrence_times_of_day?: string[] | null;
  reminder_minutes?: number | null;
};

// Locally widen the kind union — generated types lag behind the enum migration.
export type AppointmentKind =
  | "appointment"
  | "therapy"
  | "task"
  | "other"
  | "meal"
  | "sleep";

/**
 * What the UI receives. For non-recurring rows, `master_id` is null and
 * `occurrence_start` matches `starts_at`. For expanded instances of a
 * recurring series, `master_id` points to the series master and
 * `occurrence_start` is the ISO time of that occurrence (used to write
 * single-instance overrides).
 */
export type ExpandedAppointment = Appointment & {
  master_id: string | null;
  occurrence_start: string;
  is_recurring: boolean;
};

export const APPOINTMENT_KINDS: AppointmentKind[] = [
  "appointment",
  "therapy",
  "task",
  "other",
];

// ---------------------------------------------------------------------------
// Recurrence expansion
// ---------------------------------------------------------------------------

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;
const SAFETY_CAP = 500; // per master, per window

function expandMaster(
  master: Appointment,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const out: Date[] = [];
  if (!master.recurrence_freq) return out;
  const interval = Math.max(1, master.recurrence_interval ?? 1);
  const start = new Date(master.starts_at);
  if (start >= rangeEnd) return out;

  if (master.recurrence_freq === "hourly") {
    const stepMs = interval * MS_HOUR;
    // jump forward to the first occurrence inside the range
    let t = start.getTime();
    if (t < rangeStart.getTime()) {
      const diff = rangeStart.getTime() - t;
      const skips = Math.ceil(diff / stepMs);
      t = t + skips * stepMs;
    }
    let n = 0;
    while (t < rangeEnd.getTime() && n < SAFETY_CAP) {
      out.push(new Date(t));
      t += stepMs;
      n++;
    }
    return out;
  }

  if (master.recurrence_freq === "daily") {
    const stepMs = interval * MS_DAY;
    let t = start.getTime();
    if (t < rangeStart.getTime()) {
      const diff = rangeStart.getTime() - t;
      const skips = Math.ceil(diff / stepMs);
      t = t + skips * stepMs;
    }
    let n = 0;
    while (t < rangeEnd.getTime() && n < SAFETY_CAP) {
      out.push(new Date(t));
      t += stepMs;
      n++;
    }
    return out;
  }

  if (master.recurrence_freq === "weekly") {
    const weekdays = (master.recurrence_byweekday ?? []).filter(
      (w) => w >= 0 && w <= 6,
    );
    if (weekdays.length === 0) return out;
    // walk day by day from max(start, rangeStart) to rangeEnd, keeping the
    // local time-of-day equal to master's start.
    const hours = start.getHours();
    const minutes = start.getMinutes();
    const seconds = start.getSeconds();
    const cursor = new Date(Math.max(start.getTime(), rangeStart.getTime()));
    cursor.setHours(0, 0, 0, 0);
    let n = 0;
    while (cursor < rangeEnd && n < SAFETY_CAP * 7) {
      if (weekdays.includes(cursor.getDay())) {
        const occ = new Date(cursor);
        occ.setHours(hours, minutes, seconds, 0);
        if (occ >= start && occ >= rangeStart && occ < rangeEnd) {
          out.push(occ);
        }
      }
      cursor.setDate(cursor.getDate() + 1);
      n++;
    }
    return out;
  }

  return out;
}

function asExpanded(a: Appointment): ExpandedAppointment {
  return {
    ...a,
    master_id: null,
    occurrence_start: a.starts_at,
    is_recurring: false,
  };
}

function instanceFromMaster(
  master: Appointment,
  occ: Date,
  override: Appointment | null,
): ExpandedAppointment | null {
  if (override?.recurrence_cancelled) return null;
  const src = override ?? master;
  const baseStart = new Date(master.starts_at);
  const duration =
    master.ends_at != null
      ? new Date(master.ends_at).getTime() - baseStart.getTime()
      : null;
  const startIso = occ.toISOString();
  const endIso =
    duration != null ? new Date(occ.getTime() + duration).toISOString() : null;
  return {
    ...master,
    // fields overridable per-instance
    title: src.title,
    notes: src.notes,
    location: src.location,
    kind: src.kind,
    all_day: src.all_day,
    // pin times to this occurrence (or override's explicit times if given)
    starts_at: override?.starts_at ?? startIso,
    ends_at: override?.ends_at ?? endIso,
    id: override?.id ?? `${master.id}@${startIso}`,
    master_id: master.id,
    occurrence_start: startIso,
    is_recurring: true,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useAppointments(
  familyId: string | undefined | null,
  start: Date,
  end: Date,
) {
  return useQuery({
    queryKey: ["appointments", familyId, start.toISOString(), end.toISOString()],
    enabled: !!familyId,
    queryFn: async (): Promise<ExpandedAppointment[]> => {
      // 1. Plain (non-recurring, non-override) rows inside the window
      const plainRes = await supabase
        .from("appointments")
        .select("*")
        .eq("family_id", familyId!)
        .is("recurrence_freq", null)
        .is("recurrence_parent_id", null)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString());
      if (plainRes.error) throw plainRes.error;

      // 2. All recurring masters for this family (infinite series — no time filter)
      const mastersRes = await supabase
        .from("appointments")
        .select("*")
        .eq("family_id", familyId!)
        .not("recurrence_freq", "is", null);
      if (mastersRes.error) throw mastersRes.error;
      const masters = (mastersRes.data ?? []) as Appointment[];

      // 3. Overrides for those masters, only those covering this window
      let overrides: Appointment[] = [];
      if (masters.length > 0) {
        const ovRes = await supabase
          .from("appointments")
          .select("*")
          .eq("family_id", familyId!)
          .in(
            "recurrence_parent_id",
            masters.map((m) => m.id),
          )
          .gte("recurrence_override_at", start.toISOString())
          .lt("recurrence_override_at", end.toISOString());
        if (ovRes.error) throw ovRes.error;
        overrides = (ovRes.data ?? []) as Appointment[];
      }

      const overrideMap = new Map<string, Appointment>();
      for (const o of overrides) {
        if (o.recurrence_parent_id && o.recurrence_override_at) {
          overrideMap.set(
            `${o.recurrence_parent_id}@${new Date(o.recurrence_override_at).toISOString()}`,
            o,
          );
        }
      }

      const out: ExpandedAppointment[] = [];
      for (const p of (plainRes.data ?? []) as Appointment[]) {
        out.push(asExpanded(p));
      }
      for (const m of masters) {
        const occs = expandMaster(m, start, end);
        for (const occ of occs) {
          const key = `${m.id}@${occ.toISOString()}`;
          const ov = overrideMap.get(key) ?? null;
          const inst = instanceFromMaster(m, occ, ov);
          if (inst) out.push(inst);
        }
      }
      out.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
      return out;
    },
  });
}

export function useUpcomingAppointments(
  familyId: string | undefined | null,
  limit = 5,
) {
  // simple non-recurring upcoming list (kept for compatibility)
  return useQuery({
    queryKey: ["appointments-upcoming", familyId, limit],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("family_id", familyId!)
        .is("recurrence_parent_id", null)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["appointments"] });
  qc.invalidateQueries({ queryKey: ["appointments-upcoming"] });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AppointmentInsert) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert(input as never)
        .select()
        .single();
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Update an entire series (or a single non-recurring row). */
export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AppointmentUpdate }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update(patch as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Delete an entire series (cascades to overrides) or a single non-recurring row. */
export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

type InstanceOverrideInput = {
  family_id: string;
  child_id: string | null;
  created_by: string;
  master_id: string;
  occurrence_start: string; // ISO of the original occurrence being overridden
  patch: {
    title: string;
    notes: string | null;
    location: string | null;
    kind: AppointmentKind;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
  };
};

/** Edit just one occurrence of a recurring series (upserts an override row). */
export function useUpdateAppointmentInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InstanceOverrideInput) => {
      const { error } = await supabase
        .from("appointments")
        .upsert(
          {
            family_id: input.family_id,
            child_id: input.child_id,
            created_by: input.created_by,
            recurrence_parent_id: input.master_id,
            recurrence_override_at: input.occurrence_start,
            recurrence_cancelled: false,
            ...input.patch,
          } as never,
          { onConflict: "recurrence_parent_id,recurrence_override_at" },
        );
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Cancel just one occurrence of a recurring series. */
export function useDeleteAppointmentInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      family_id: string;
      child_id: string | null;
      created_by: string;
      master_id: string;
      occurrence_start: string;
      title: string;
      kind: AppointmentKind;
    }) => {
      const { error } = await supabase.from("appointments").upsert(
        {
          family_id: input.family_id,
          child_id: input.child_id,
          created_by: input.created_by,
          recurrence_parent_id: input.master_id,
          recurrence_override_at: input.occurrence_start,
          recurrence_cancelled: true,
          // satisfy NOT NULL columns on the row
          title: input.title,
          kind: input.kind,
          starts_at: input.occurrence_start,
          all_day: false,
        } as never,
        { onConflict: "recurrence_parent_id,recurrence_override_at" },
      );
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}
