import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MissedCheck =
  Database["public"]["Tables"]["care_place_missed_checks"]["Row"];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useTodayMissedChecks(familyId: string | undefined | null) {
  const today = todayISO();
  return useQuery({
    queryKey: ["care-place-missed-today", familyId, today],
    enabled: !!familyId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_place_missed_checks")
        .select("*")
        .eq("family_id", familyId!)
        .eq("scheduled_date", today)
        .order("scheduled_time", { ascending: true });
      if (error) throw error;
      return data as MissedCheck[];
    },
  });
}
