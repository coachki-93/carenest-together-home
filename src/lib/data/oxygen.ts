import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { computeRemaining, durationMinutes, type OxygenTankRow, type TankType } from "@/lib/oxygen/tanks";

export type OxygenTank = Database["public"]["Tables"]["oxygen_tanks"]["Row"];

export function useActiveOxygenTank(familyId: string | null | undefined) {
  return useQuery({
    queryKey: ["oxygen-active", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oxygen_tanks")
        .select("*")
        .eq("family_id", familyId!)
        .is("replaced_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as OxygenTank | null) ?? null;
    },
  });
}

export function useOxygenHistory(familyId: string | null | undefined) {
  return useQuery({
    queryKey: ["oxygen-history", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oxygen_tanks")
        .select("*")
        .eq("family_id", familyId!)
        .not("replaced_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as OxygenTank[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["oxygen-active"] });
  qc.invalidateQueries({ queryKey: ["oxygen-history"] });
}

export function useStartTank() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: {
      family_id: string;
      tank_type: TankType;
      flow_lpm: number;
      started_at?: string;
      notes?: string | null;
      created_by?: string | null;
    }) => {
      // Close any existing active tank first
      const { error: closeErr } = await supabase
        .from("oxygen_tanks")
        .update({ replaced_at: new Date().toISOString() })
        .eq("family_id", input.family_id)
        .is("replaced_at", null);
      if (closeErr) throw closeErr;

      const { data, error } = await supabase
        .from("oxygen_tanks")
        .insert({
          family_id: input.family_id,
          tank_type: input.tank_type,
          flow_lpm: input.flow_lpm,
          started_at: input.started_at ?? new Date().toISOString(),
          notes: input.notes ?? null,
          created_by: input.created_by ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as OxygenTank;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useReplaceTank() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: { current: OxygenTank; flow_lpm: number; notes?: string | null; created_by?: string | null }) => {
      const now = new Date().toISOString();
      const { error: closeErr } = await supabase
        .from("oxygen_tanks")
        .update({ replaced_at: now })
        .eq("id", input.current.id);
      if (closeErr) throw closeErr;
      const { data, error } = await supabase
        .from("oxygen_tanks")
        .insert({
          family_id: input.current.family_id,
          tank_type: input.current.tank_type,
          flow_lpm: input.flow_lpm,
          started_at: now,
          notes: input.notes ?? null,
          created_by: input.created_by ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as OxygenTank;
    },
    onSuccess: () => invalidate(qc),
  });
}

/**
 * Change flow rate mid-tank. We close the current row and open a new one
 * with `started_at` back-dated so that the *remaining minutes* at the new
 * flow equals the remaining fraction of the tank at the old flow.
 */
export function useChangeFlow() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: { current: OxygenTank; new_flow_lpm: number; created_by?: string | null }) => {
      const now = new Date();
      const remaining = computeRemaining(input.current as OxygenTankRow, now);
      const newTotal = durationMinutes(input.current.tank_type as TankType, input.new_flow_lpm);
      if (newTotal == null) throw new Error("Unsupported flow rate");

      const remainingMin = remaining ? remaining.remainingMinutes : newTotal;
      // % remaining of the tank's contents (independent of flow)
      const pct = remaining ? remaining.percentRemaining / 100 : 1;
      const newRemaining = Math.min(newTotal, Math.max(0, pct * newTotal));
      const backdatedStart = new Date(now.getTime() - (newTotal - newRemaining) * 60000);

      const { error: closeErr } = await supabase
        .from("oxygen_tanks")
        .update({ replaced_at: now.toISOString() })
        .eq("id", input.current.id);
      if (closeErr) throw closeErr;

      const { data, error } = await supabase
        .from("oxygen_tanks")
        .insert({
          family_id: input.current.family_id,
          tank_type: input.current.tank_type,
          flow_lpm: input.new_flow_lpm,
          started_at: backdatedStart.toISOString(),
          notes: `Flow changed from ${input.current.flow_lpm} to ${input.new_flow_lpm} l/min (carried ${Math.round(remainingMin)} min remaining)`,
          created_by: input.created_by ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as OxygenTank;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteOxygenTank() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("oxygen_tanks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
