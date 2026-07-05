import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Read receipts for handovers. Table is append-only per (handover_id, user_id):
 * inserts only, no updates, no deletes. When a handover is edited afterwards,
 * a read whose `read_at` is earlier than the handover's `edited_at` counts as
 * "read before edit" — the app treats the reader as unread again.
 */
export interface HandoverRead {
  handover_id: string;
  user_id: string;
  read_at: string;
}

/**
 * Fetch all read receipts for a set of handover ids in one round trip.
 * Returns them grouped by handover id.
 */
export function useHandoverReadsBulk(handoverIds: string[]) {
  // Stable key: sorted so equal sets share cache regardless of order.
  const key = useMemo(() => [...handoverIds].sort(), [handoverIds]);
  return useQuery({
    queryKey: ["handover-reads", key],
    enabled: handoverIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_reads")
        .select("handover_id,user_id,read_at")
        .in("handover_id", key);
      if (error) throw error;
      const rows = (data ?? []) as HandoverRead[];
      const byHandover = new Map<string, HandoverRead[]>();
      for (const r of rows) {
        const arr = byHandover.get(r.handover_id) ?? [];
        arr.push(r);
        byHandover.set(r.handover_id, arr);
      }
      return byHandover;
    },
  });
}

export function useMarkHandoverRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (handoverId: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not authenticated");
      // Insert own receipt; ignore if it already exists.
      const { error } = await supabase
        .from("handover_reads")
        .insert({ handover_id: handoverId, user_id: uid });
      if (error && error.code !== "23505") throw error; // 23505 = unique_violation
      return { handoverId, userId: uid };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handover-reads"] });
    },
  });
}

/**
 * Is this handover unread by the viewer (or read only *before* the last edit)?
 * `editedAt` is the handover's `edited_at`; when null the handover has never
 * been edited and any read counts.
 */
export function isUnreadForViewer(
  reads: HandoverRead[] | undefined,
  viewerUserId: string | null | undefined,
  editedAt: string | null | undefined,
): boolean {
  if (!viewerUserId) return false;
  const mine = (reads ?? []).find((r) => r.user_id === viewerUserId);
  if (!mine) return true;
  if (!editedAt) return false;
  return new Date(mine.read_at).getTime() < new Date(editedAt).getTime();
}
