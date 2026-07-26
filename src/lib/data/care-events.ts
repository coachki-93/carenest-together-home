import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { parseCareNeeds } from "@/lib/care-needs/parse";
import { findCapability } from "@/lib/care-needs/catalog";

export type CareEvent = Database["public"]["Tables"]["care_events"]["Row"];
export type CareEventInsert =
  Database["public"]["Tables"]["care_events"]["Insert"];
export type CareEventType = Database["public"]["Enums"]["care_event_type"];

export const CARE_EVENT_TYPES: CareEventType[] = [
  "seizure",
  "desaturation",
  "vomiting",
  "feed_issue",
  "breathing_difficulty",
  "behavioural",
  "injury",
  "other",
];

/**
 * Edit window for author self-edits, in minutes.
 *
 * Server-side source of truth is the `edit_care_event` RPC — it
 * hardcodes `interval '2 hours'`. This constant MUST equal 2 hours;
 * the UI gate is cosmetic. Table has NO broad UPDATE policy, so
 * all edits go through the RPC.
 */
export const CARE_EVENT_EDIT_WINDOW_MINUTES = 120;

/** Cosmetic gate for the Edit button. Server RPC re-checks author + window. */
export function canEditCareEvent(
  ev: Pick<CareEvent, "created_by" | "created_at">,
  viewerUserId: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!viewerUserId || ev.created_by !== viewerUserId) return false;
  const ageMs = now.getTime() - new Date(ev.created_at).getTime();
  return ageMs < CARE_EVENT_EDIT_WINDOW_MINUTES * 60 * 1000;
}

/**
 * Order event types by care-need relevance. Types implied by any selected
 * capability come first (in canonical order), then the rest. Never
 * restricts — every type is always available for logging.
 */
export function orderedEventTypesFor(
  careNeedsRaw: unknown,
): CareEventType[] {
  const cn = parseCareNeeds(careNeedsRaw);
  const relevant = new Set<CareEventType>();
  for (const key of cn.capabilities) {
    for (const t of suggestedTypesForCapability(key)) relevant.add(t);
  }
  const first = CARE_EVENT_TYPES.filter((t) => relevant.has(t));
  const rest = CARE_EVENT_TYPES.filter((t) => !relevant.has(t));
  return [...first, ...rest];
}

/** Pure — the capability → event-types mapping. Semi-permanent. */
export function suggestedTypesForCapability(
  capabilityKey: string,
): CareEventType[] {
  const cap = findCapability(capabilityKey);
  if (!cap) return [];
  // Neurological → seizure
  if (capabilityKey === "seizures" || capabilityKey === "vns") {
    return ["seizure"];
  }
  // Airways → desaturation + breathing difficulty
  if (cap.category === "airways") {
    return ["desaturation", "breathing_difficulty"];
  }
  // Feeding → vomiting + feed issue
  if (cap.category === "feeding") {
    return ["vomiting", "feed_issue"];
  }
  // Metabolic → other (metabolic crash / hypo)
  if (cap.category === "metabolic") {
    return ["other"];
  }
  return [];
}

export function useCareEvents(
  familyId: string | undefined | null,
  opts?: { includeArchived?: boolean; limit?: number },
) {
  const includeArchived = !!opts?.includeArchived;
  const limit = opts?.limit ?? 200;
  return useQuery({
    queryKey: ["care-events", familyId, includeArchived, limit],
    enabled: !!familyId,
    queryFn: async () => {
      let q = supabase
        .from("care_events")
        .select("*")
        .eq("family_id", familyId!)
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (!includeArchived) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as CareEvent[];
    },
  });
}

export function useCareEventsInWindow(
  familyId: string | undefined | null,
  start: Date | null,
  end: Date | null,
) {
  const startIso = start?.toISOString();
  const endIso = end?.toISOString();
  return useQuery({
    queryKey: ["care-events-window", familyId, startIso, endIso],
    enabled: !!familyId && !!startIso && !!endIso,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_events")
        .select("*")
        .eq("family_id", familyId!)
        .eq("active", true)
        .gte("occurred_at", startIso!)
        .lt("occurred_at", endIso!)
        .order("occurred_at", { ascending: true });
      if (error) throw error;
      return data as CareEvent[];
    },
  });
}

export function useCreateCareEvent() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: CareEventInsert) => {
      const { data, error } = await supabase
        .from("care_events")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as CareEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-events"] });
      qc.invalidateQueries({ queryKey: ["care-events-window"] });
      qc.invalidateQueries({ queryKey: ["handover-prefill"] });
    },
  });
}

export function useEditCareEvent() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (args: {
      id: string;
      occurred_at: string;
      type: CareEventType;
      description: string;
      action_taken: string | null;
      severity: number | null;
      duration_seconds: number | null;
      caregiver_profile_id: string | null;
    }) => {
      const { data, error } = await supabase.rpc("edit_care_event", {
        _id: args.id,
        _occurred_at: args.occurred_at,
        _type: args.type,
        _description: args.description,
        _action_taken: args.action_taken as unknown as string,
        _severity: args.severity as unknown as number,
        _duration_seconds: args.duration_seconds as unknown as number,
        _caregiver_profile_id: args.caregiver_profile_id as unknown as string,
      });
      if (error) throw error;
      return data as CareEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-events"] });
      qc.invalidateQueries({ queryKey: ["care-events-window"] });
      qc.invalidateQueries({ queryKey: ["handover-prefill"] });
    },
  });
}

export function useSetCareEventActive() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (args: { id: string; active: boolean }) => {
      const { data, error } = await supabase.rpc("set_care_event_active", {
        _id: args.id,
        _active: args.active,
      });
      if (error) throw error;
      return data as CareEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-events"] });
      qc.invalidateQueries({ queryKey: ["care-events-window"] });
      qc.invalidateQueries({ queryKey: ["handover-prefill"] });
    },
  });
}

export function useDeleteCareEvent() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("care_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-events"] });
      qc.invalidateQueries({ queryKey: ["care-events-window"] });
      qc.invalidateQueries({ queryKey: ["handover-prefill"] });
    },
  });
}

/**
 * Format a care event as a handover prefill line.
 * Severity is omitted when null (no dangling parens). Duration is omitted
 * when null. Action is appended after " · Åtgärd: " only when present.
 */
export function formatCareEventLine(
  ev: Pick<
    CareEvent,
    "occurred_at" | "type" | "description" | "action_taken" | "severity" | "duration_seconds"
  >,
  labels: {
    typeLabel: (t: CareEventType) => string;
    severityLabel: (n: number) => string;
    actionPrefix: string;
    /** Formats seconds → "1 min 30 s" / "45 s" / "2 min". */
    duration: (seconds: number) => string;
  },
): string {
  const d = new Date(ev.occurred_at);
  const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return _formatCareEventLine(ev, labels, time);
}

/** Internal: caller supplies a preformatted family-tz "HH:mm". */
export function _formatCareEventLine(
  ev: Pick<
    CareEvent,
    "type" | "description" | "action_taken" | "severity" | "duration_seconds"
  >,
  labels: {
    typeLabel: (t: CareEventType) => string;
    severityLabel: (n: number) => string;
    actionPrefix: string;
    duration: (seconds: number) => string;
  },
  time: string,
): string {
  const typeStr = labels.typeLabel(ev.type);
  const sevStr = ev.severity != null ? ` (${labels.severityLabel(ev.severity)})` : "";
  const durStr =
    ev.duration_seconds != null && ev.duration_seconds > 0
      ? ` · ${labels.duration(ev.duration_seconds)}`
      : "";
  const desc = ev.description.trim();
  const action = ev.action_taken?.trim()
    ? ` · ${labels.actionPrefix}: ${ev.action_taken.trim()}`
    : "";
  return `• ${time} ${typeStr}${sevStr}${durStr} — ${desc}${action}`;
}
