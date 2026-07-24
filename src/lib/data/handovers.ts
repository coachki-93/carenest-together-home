import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Handover = Database["public"]["Tables"]["handovers"]["Row"];
export type HandoverInsert = Database["public"]["Tables"]["handovers"]["Insert"];
export type ShiftLabel = Database["public"]["Enums"]["shift_label"];

export const SHIFT_LABELS: ShiftLabel[] = ["morning", "afternoon", "night", "custom"];

/**
 * Edit window for author self-edits, in minutes.
 *
 * Server-side source of truth is the `edit_handover` RPC and the
 * `Authors can update their handovers within window` RLS policy — both
 * hardcode `interval '2 hours'`. This constant MUST equal 2 hours; the
 * UI gate is cosmetic. If you change it, change the RPC and the policy
 * in the same migration.
 */
export const HANDOVER_EDIT_WINDOW_MINUTES = 120;

/** Cosmetic gate for the Edit button. Server RPC re-checks author + window. */
export function canEditHandover(
  h: Pick<Handover, "author_id" | "created_at">,
  viewerUserId: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!viewerUserId || h.author_id !== viewerUserId) return false;
  const ageMs = now.getTime() - new Date(h.created_at).getTime();
  return ageMs < HANDOVER_EDIT_WINDOW_MINUTES * 60 * 1000;
}

export function useHandovers(familyId: string | undefined | null, limit = 20) {
  return useQuery({
    queryKey: ["handovers", familyId, limit],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handovers")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Handover[];
    },
  });
}

export function useLatestHandover(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["handovers-latest", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handovers")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Handover | null;
    },
  });
}

export function useCreateHandover() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async (input: HandoverInsert) => {
      const { data, error } = await supabase
        .from("handovers")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Handover;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handovers"] });
      qc.invalidateQueries({ queryKey: ["handovers-latest"] });
    },
  });
}

export function useDeleteHandover() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("handovers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handovers"] });
      qc.invalidateQueries({ queryKey: ["handovers-latest"] });
    },
  });
}

/**
 * Author-only edit within HANDOVER_EDIT_WINDOW_MINUTES.
 *
 * Calls the SECURITY DEFINER `edit_handover` RPC which:
 * - re-checks caller is the author (RPC bypasses RLS, so enforces itself)
 * - re-checks `created_at > now() - interval '2 hours'`
 * - updates the fields and sets `edited_at = now()`
 * - deletes all `handover_reads` for this row so other caregivers get
 *   re-prompted to read the updated version
 *
 * All in one transaction — reads-delete cannot half-apply relative to the
 * text update. Direct-table UPDATE is also gated by the tightened RLS
 * policy of the same window, so an attacker can't bypass this by bypassing
 * the RPC.
 */
export function useEditHandover() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (args: {
      id: string;
      shift: ShiftLabel;
      shift_start: string | null;
      shift_end: string | null;
      summary: string | null;
      sleep: string | null;
      mood: string | null;
      seizures: string | null;
      fluids: string | null;
      meds: string | null;
      notes: string | null;
    }) => {
      const { data, error } = await supabase.rpc("edit_handover", {
        _id: args.id,
        _shift: args.shift,
        _shift_start: args.shift_start as unknown as string,
        _shift_end: args.shift_end as unknown as string,
        _summary: args.summary as unknown as string,
        _sleep: args.sleep as unknown as string,
        _mood: args.mood as unknown as string,
        _seizures: args.seizures as unknown as string,
        _fluids: args.fluids as unknown as string,
        _meds: args.meds as unknown as string,
        _notes: args.notes as unknown as string,
      });
      if (error) throw error;
      return data as Handover;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handovers"] });
      qc.invalidateQueries({ queryKey: ["handovers-latest"] });
      qc.invalidateQueries({ queryKey: ["handover-reads"] });
    },
  });
}
