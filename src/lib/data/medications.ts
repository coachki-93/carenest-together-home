import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Medication = Database["public"]["Tables"]["medications"]["Row"];
export type MedicationInsert = Database["public"]["Tables"]["medications"]["Insert"];
export type MedicationUpdate = Database["public"]["Tables"]["medications"]["Update"];
export type MedLog = Database["public"]["Tables"]["med_logs"]["Row"];
export type MedRoute = Database["public"]["Enums"]["med_route"];
export type MedLogStatus = Database["public"]["Enums"]["med_log_status"];

export function useFamilyChild(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["family-child", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMedications(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["medications", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Medication[];
    },
  });
}

/** Med logs for [start, end). */
export function useMedLogs(familyId: string | undefined | null, start: Date, end: Date) {
  return useQuery({
    queryKey: ["med-logs", familyId, start.toISOString(), end.toISOString()],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("med_logs")
        .select("*")
        .eq("family_id", familyId!)
        .gte("scheduled_for", start.toISOString())
        .lt("scheduled_for", end.toISOString());
      if (error) throw error;
      return data as MedLog[];
    },
  });
}

export function useSaveMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MedicationInsert & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { data, error } = await supabase
          .from("medications")
          .update(rest as MedicationUpdate)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("medications")
          .insert(input)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
    },
  });
}

export function useDeleteMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["med-logs"] });
    },
  });
}

export function useLogDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      family_id: string;
      child_id: string;
      medication_id: string;
      scheduled_for: string;
      status: MedLogStatus;
      given_by?: string | null;
      caregiver_profile_id?: string | null;
      notes?: string | null;
    }) => {
      // Upsert on (medication_id, scheduled_for) unique constraint
      const payload = {
        ...input,
        given_at: input.status === "given" ? new Date().toISOString() : null,
      };
      const { data, error } = await supabase
        .from("med_logs")
        .upsert(payload, { onConflict: "medication_id,scheduled_for" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["med-logs"] });
    },
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("med_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["med-logs"] });
    },
  });
}

/** Build today's "HH:MM" -> Date occurrences across all active medications. */
export interface ScheduledDose {
  key: string; // medication_id + scheduled_for ISO
  medication: Medication;
  time: string; // 'HH:MM'
  scheduled_for: Date;
  log?: MedLog;
}

export function buildTodaysDoses(
  meds: Medication[],
  logs: MedLog[],
  day: Date = new Date(),
): ScheduledDose[] {
  const out: ScheduledDose[] = [];
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const logByKey = new Map<string, MedLog>();
  for (const l of logs) {
    logByKey.set(`${l.medication_id}|${new Date(l.scheduled_for).toISOString()}`, l);
  }
  for (const m of meds) {
    if (!m.active) continue;
    for (const t of m.times ?? []) {
      const [hh, mm] = t.split(":").map((n) => parseInt(n, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
      const scheduled = new Date(dayStart);
      scheduled.setHours(hh, mm, 0, 0);
      const iso = scheduled.toISOString();
      out.push({
        key: `${m.id}|${iso}`,
        medication: m,
        time: t,
        scheduled_for: scheduled,
        log: logByKey.get(`${m.id}|${iso}`),
      });
    }
  }
  out.sort((a, b) => a.scheduled_for.getTime() - b.scheduled_for.getTime());
  return out;
}
