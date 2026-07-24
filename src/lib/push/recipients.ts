/**
 * Shared push-recipient resolver.
 *
 * Every push sender (three cron sweeps + two server functions) MUST route its
 * `push_subscriptions` lookup through {@link createRecipientResolver} so the
 * "only when I'm needed" contract is enforced in one place. Adding a new
 * category or a new sender without updating this file is the exact regression
 * this module exists to prevent.
 *
 * Owners receive only the always-on categories (late, missed, critical,
 * oxygen, stock) unless `families.owner_notify_level = 'all'`. Caregivers
 * receive everything. The `stock` category is role-independent: owners plus
 * any member with `material_responsible = true` receive it.
 *
 * Per-invocation caching: instantiate one resolver per hook run; families
 * touched multiple times in the same run pay one DB round-trip each.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type NotifyCategory =
  | "start"
  | "reminder"
  | "late"
  | "missed"
  | "critical"
  | "oxygen"
  | "stock"
  | "ongoing";

export type PushRecipient = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
};

/** Owners still receive these regardless of `owner_notify_level`. */
const OWNER_ALWAYS_ON: ReadonlySet<NotifyCategory> = new Set([
  "late",
  "missed",
  "critical",
  "oxygen",
  "stock",
]);

type MemberInfo = { role: string; material_responsible: boolean };

// Loosely-typed accessor — this module runs both under `supabaseAdmin`
// (service role) and would work with any client; we don't want a hard
// dependency on the generated Database type here.
type AnyClient = Pick<SupabaseClient, "from">;

export function createRecipientResolver(admin: AnyClient) {
  const membersCache = new Map<string, Map<string, MemberInfo>>();
  const levelCache = new Map<string, "exceptions" | "all">();
  const subsCache = new Map<string, PushRecipient[]>();

  async function loadMembers(familyId: string) {
    const cached = membersCache.get(familyId);
    if (cached) return cached;
    const { data } = await admin
      .from("family_members")
      .select("user_id, role, material_responsible")
      .eq("family_id", familyId);
    const m = new Map<string, MemberInfo>();
    for (const r of (data ?? []) as Array<{
      user_id: string;
      role: string;
      material_responsible: boolean | null;
    }>) {
      m.set(r.user_id, {
        role: String(r.role),
        material_responsible: !!r.material_responsible,
      });
    }
    membersCache.set(familyId, m);
    return m;
  }

  async function loadLevel(familyId: string): Promise<"exceptions" | "all"> {
    const cached = levelCache.get(familyId);
    if (cached) return cached;
    const { data } = await admin
      .from("families")
      .select("owner_notify_level")
      .eq("id", familyId)
      .maybeSingle();
    const lv =
      (data as { owner_notify_level?: string } | null)?.owner_notify_level === "all"
        ? "all"
        : "exceptions";
    levelCache.set(familyId, lv);
    return lv;
  }

  async function loadSubs(familyId: string) {
    const cached = subsCache.get(familyId);
    if (cached) return cached;
    const { data } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id")
      .eq("family_id", familyId);
    const s = ((data ?? []) as PushRecipient[]).slice();
    subsCache.set(familyId, s);
    return s;
  }

  async function getRecipients(
    familyId: string,
    category: NotifyCategory,
    opts?: { excludeUserId?: string | null },
  ): Promise<PushRecipient[]> {
    const [subs, members, level] = await Promise.all([
      loadSubs(familyId),
      loadMembers(familyId),
      loadLevel(familyId),
    ]);
    const ownerAll = level === "all";
    return subs.filter((s) => {
      if (opts?.excludeUserId && s.user_id === opts.excludeUserId) return false;
      const m = members.get(s.user_id);
      if (!m) return false;
      if (category === "stock") {
        // Role-independent: owner OR anyone with material_responsible.
        return m.role === "owner" || m.material_responsible;
      }
      if (m.role !== "owner") return true;
      return ownerAll || OWNER_ALWAYS_ON.has(category);
    });
  }

  /** For tests: preseed the caches so a resolver can be exercised in memory. */
  function _seed(
    familyId: string,
    input: {
      subs: PushRecipient[];
      members: Array<{ user_id: string; role: string; material_responsible?: boolean }>;
      ownerNotifyLevel?: "exceptions" | "all";
    },
  ) {
    subsCache.set(familyId, input.subs.slice());
    const m = new Map<string, MemberInfo>();
    for (const r of input.members) {
      m.set(r.user_id, {
        role: r.role,
        material_responsible: !!r.material_responsible,
      });
    }
    membersCache.set(familyId, m);
    levelCache.set(familyId, input.ownerNotifyLevel ?? "exceptions");
  }

  return { getRecipients, _seed };
}

export type RecipientResolver = ReturnType<typeof createRecipientResolver>;
