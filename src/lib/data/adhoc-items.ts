import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CarePlaceTime } from "./care-place-checks";

export type AdhocItem =
  Database["public"]["Tables"]["care_place_adhoc_items"]["Row"];

/** Returns the next upcoming active slot (today's first slot still in the future,
 *  or the earliest active slot tomorrow if all of today's are past). */
export function nextUpcomingSlot(
  times: CarePlaceTime[],
  now: Date,
): { date: string; time: string; slot: CarePlaceTime } | null {
  const active = times.filter((t) => t.active);
  if (active.length === 0) return null;
  const sorted = [...active].sort((a, b) =>
    a.time_of_day.localeCompare(b.time_of_day),
  );
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  for (const t of sorted) {
    const [h, m] = t.time_of_day.split(":").map(Number);
    if (h * 60 + m > nowMin) {
      return { date: today, time: t.time_of_day, slot: t };
    }
  }
  // All today's slots are past — pick tomorrow's first.
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  return { date: tDate, time: sorted[0].time_of_day, slot: sorted[0] };
}

/** Open (unresolved) ad-hoc items for a family. */
export function useOpenAdhocItems(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["adhoc-items-open", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_place_adhoc_items")
        .select("*")
        .eq("family_id", familyId!)
        .is("resolved_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as AdhocItem[];
    },
  });
}

export interface AddAdhocInput {
  familyId: string;
  inventoryItemId: string;
  label: string;
  forSlotDate: string;
  forSlotTime: string;
  createdBy: string;
}

export function useAddAdhocItem() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async (input: AddAdhocInput) => {
      const { error } = await supabase.from("care_place_adhoc_items").insert({
        family_id: input.familyId,
        inventory_item_id: input.inventoryItemId,
        label: input.label,
        for_slot_date: input.forSlotDate,
        for_slot_time: input.forSlotTime,
        created_by: input.createdBy,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["adhoc-items-open"] }),
  });
}

export function useResolveAdhocItem() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async (input: { id: string; checkId: string | null }) => {
      const { error } = await supabase
        .from("care_place_adhoc_items")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_check_id: input.checkId,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["adhoc-items-open"] }),
  });
}

export function useDeleteAdhocItem() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("care_place_adhoc_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["adhoc-items-open"] }),
  });
}
