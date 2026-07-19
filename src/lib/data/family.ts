import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Child = Database["public"]["Tables"]["children"]["Row"];
export type ChildUpdate = Database["public"]["Tables"]["children"]["Update"];
export type FamilyMember = Database["public"]["Tables"]["family_members"]["Row"];
export type Invite = Database["public"]["Tables"]["invites"]["Row"];
export type MemberRole = Database["public"]["Enums"]["member_role"];

export interface MemberWithProfile extends FamilyMember {
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    avatar_color: string | null;
  } | null;
}

export function useUpdateChild() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async ({ id, patch }: { id: string; patch: ChildUpdate }) => {
      const { data, error } = await supabase
        .from("children")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-child"] });
    },
  });
}

export function useFamilyMembers(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["family-members", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("family_id", familyId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;

      const ids = (members ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [] as MemberWithProfile[];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, avatar_color")
        .in("id", ids);
      if (pErr) throw pErr;

      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (members ?? []).map((m) => ({
        ...m,
        profile: byId.get(m.user_id) ?? null,
      })) as MemberWithProfile[];
    },
  });
}

export function useInvites(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["invites", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invite[];
    },
  });
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 8; i++) s += alphabet[arr[i] % alphabet.length];
  return s;
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async ({
      familyId,
      createdBy,
      invitedEmail,
      daysValid = 14,
    }: {
      familyId: string;
      createdBy: string;
      invitedEmail?: string | null;
      daysValid?: number;
    }) => {
      const expires = new Date();
      expires.setDate(expires.getDate() + daysValid);
      const { data, error } = await supabase
        .from("invites")
        .insert({
          family_id: familyId,
          created_by: createdBy,
          code: generateCode(),
          expires_at: expires.toISOString(),
          status: "pending",
          invited_email: invitedEmail?.trim().toLowerCase() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Invite;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invites")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-members"] }),
  });
}

export function useSetMaterialResponsible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("family_members")
        .update({ material_responsible: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-members"] });
      qc.invalidateQueries({ queryKey: ["my-membership"] });
    },
  });
}

export function useFamily(familyId: string | undefined | null) {
  return useQuery({
    queryKey: ["family", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select(
          "id, name, owner_id, at_hospital_since, handover_reminder_minutes, handover_reminder_duration_minutes, timezone, notification_language",
        )
        .eq("id", familyId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateHandoverReminderMinutes() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async ({
      familyId,
      leadMinutes,
      durationMinutes,
    }: {
      familyId: string;
      leadMinutes: number;
      durationMinutes: number;
    }) => {
      const { error } = await supabase
        .from("families")
        .update({
          handover_reminder_minutes: leadMinutes,
          handover_reminder_duration_minutes: durationMinutes,
        })
        .eq("id", familyId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["family", vars.familyId] });
    },
  });
}

export function useUpdateFamilyLocale() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async ({
      familyId,
      timezone,
      notificationLanguage,
    }: {
      familyId: string;
      timezone?: string;
      notificationLanguage?: "en" | "sv";
    }) => {
      const patch: Database["public"]["Tables"]["families"]["Update"] = {};
      if (timezone !== undefined) patch.timezone = timezone;
      if (notificationLanguage !== undefined)
        patch.notification_language = notificationLanguage;
      const { error } = await supabase
        .from("families")
        .update(patch)
        .eq("id", familyId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["family", vars.familyId] });
    },
  });
}

export function useSetHospitalMode() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressGlobalError: true }, // safe: all callers try/catch mutateAsync or set per-call onError (audited 2026-07-19)
    mutationFn: async ({ familyId, on }: { familyId: string; on: boolean }) => {
      const { data, error } = await supabase.rpc("set_family_hospital_mode", {
        _family_id: familyId,
        _on: on,
      });
      if (error) throw error;
      return data as string | null;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["family", vars.familyId] });
      qc.invalidateQueries({ queryKey: ["oxygen-active"] });
      qc.invalidateQueries({ queryKey: ["oxygen-history"] });
    },
  });
}
