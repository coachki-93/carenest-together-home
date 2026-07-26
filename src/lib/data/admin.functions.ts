import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Platform-admin support server functions (N1).
 *
 * Data-minimization contract — by construction, not discipline:
 *  - The only tables ever named in this file are the METADATA allow-list:
 *      families, family_members, profiles, team_accounts,
 *      platform_admins, admin_audit_log.
 *    No health table (children, care_events, vitals, medications, med_logs,
 *    handovers, appointments, oxygen_tanks, inventory_*, maintenance_*,
 *    care_place_*, tidy_*, etc.) is referenced anywhere in this module.
 *  - No `.select("*")`. Every query names its columns explicitly.
 *  - No dynamic table names. No dynamic SQL. No RPC calls.
 *  - Auth admin API is used only for admin.getUserById / generateLink /
 *    updateUserById on a target user_id resolved through the allow-list.
 *
 * Gate contract:
 *  - Every entry point uses requireSupabaseAuth and calls
 *    assertCallerIsPlatformAdmin BEFORE any supabaseAdmin import. The gate
 *    is verified against the caller's RLS-scoped context.supabase using the
 *    is_platform_admin(_uid) SECURITY DEFINER helper.
 *  - platform_admins has no INSERT/UPDATE/DELETE policies; even if a fn
 *    below tried to write to it via the caller client, RLS would reject.
 *
 * Audit contract:
 *  - Every function (view + action) writes one row to admin_audit_log via
 *    supabaseAdmin AFTER the successful work. detail is a narrow JSON
 *    object — it never contains passwords, tokens, or recovery links.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertCallerIsPlatformAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
  // Uses the caller's RLS-scoped client; is_platform_admin is a SECURITY
  // DEFINER helper that only reads platform_admins. No admin client here.
  const { data, error } = await supabase.rpc("is_platform_admin", {
    _uid: userId,
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Forbidden: platform admin only");
}

async function logAdminAction(
  adminUserId: string,
  action: string,
  fields: {
    target_family_id?: string | null;
    target_user_id?: string | null;
    detail?: Record<string, unknown>;
  } = {},
): Promise<void> {
  // Audit write happens with the admin client (append-only table; no
  // authenticated INSERT policy). detail is a narrow allow-listed object.
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action,
      target_family_id: fields.target_family_id ?? null,
      target_user_id: fields.target_user_id ?? null,
      detail: fields.detail ?? {},
    });
  } catch (e) {
    // Never fail an admin action because audit logging failed; surface to
    // server logs. (Rows can also be reconstructed from worker logs.)
    console.error("[admin] audit log write failed", e);
  }
}

// ---------------------------------------------------------------------------
// whoAmIAdmin — cheap gate probe for the /admin route
// ---------------------------------------------------------------------------

interface WhoAmIAdminResult {
  isAdmin: boolean;
}

export const whoAmIAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WhoAmIAdminResult> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("is_platform_admin", {
      _uid: userId,
    });
    if (error) throw new Error(error.message);
    return { isAdmin: data === true };
    // No audit write on this one — it's the gate probe itself, called on
    // every /admin mount. Auditing it would flood the log with no signal.
  });

// ---------------------------------------------------------------------------
// adminListFamilies — metadata list, paginated
// ---------------------------------------------------------------------------

interface AdminListFamiliesInput {
  search?: string;
  limit?: number;
  offset?: number;
}

interface AdminFamilyRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  at_hospital_since: string | null;
  member_count: number;
}

interface AdminListFamiliesResult {
  families: AdminFamilyRow[];
  total: number;
}

export const adminListFamilies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AdminListFamiliesInput) => {
    const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
    const offset = Math.max(input?.offset ?? 0, 0);
    const search =
      typeof input?.search === "string" ? input.search.trim().slice(0, 120) : "";
    return { limit, offset, search };
  })
  .handler(async ({ data, context }): Promise<AdminListFamiliesResult> => {
    const { supabase, userId } = context;
    await assertCallerIsPlatformAdmin(supabase, userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // ONLY families columns + family_members COUNT. No child/health data.
    let q = supabaseAdmin
      .from("families")
      .select(
        "id, name, owner_id, created_at, at_hospital_since, family_members(count)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.search) q = q.ilike("name", `%${data.search}%`);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const families: AdminFamilyRow[] = (rows ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      owner_id: r.owner_id as string,
      created_at: r.created_at as string,
      at_hospital_since: (r.at_hospital_since as string | null) ?? null,
      member_count:
        Array.isArray(r.family_members) && r.family_members[0]
          ? Number((r.family_members[0] as { count: number }).count) || 0
          : 0,
    }));

    await logAdminAction(userId, "families.list", {
      detail: {
        search: data.search || null,
        limit: data.limit,
        offset: data.offset,
        returned: families.length,
      },
    });

    return { families, total: count ?? families.length };
  });

// ---------------------------------------------------------------------------
// adminListAccounts — metadata list of user accounts
// ---------------------------------------------------------------------------

interface AdminListAccountsInput {
  search?: string; // matches profiles.full_name (case-insensitive)
  limit?: number;
  offset?: number;
}

interface AdminAccountRow {
  user_id: string;
  full_name: string | null;
  account_type: string | null;
  onboarded: boolean | null;
  is_team_account: boolean;
  created_at: string | null;
}

interface AdminListAccountsResult {
  accounts: AdminAccountRow[];
  total: number;
}

export const adminListAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AdminListAccountsInput) => {
    const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
    const offset = Math.max(input?.offset ?? 0, 0);
    const search =
      typeof input?.search === "string" ? input.search.trim().slice(0, 120) : "";
    return { limit, offset, search };
  })
  .handler(async ({ data, context }): Promise<AdminListAccountsResult> => {
    const { supabase, userId } = context;
    await assertCallerIsPlatformAdmin(supabase, userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let q = supabaseAdmin
      .from("profiles")
      .select("id, full_name, account_type, onboarded, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.search) q = q.ilike("full_name", `%${data.search}%`);

    const { data: profileRows, error: profErr, count } = await q;
    if (profErr) throw new Error(profErr.message);

    const ids = (profileRows ?? []).map((r) => r.id as string);
    let teamIds = new Set<string>();
    if (ids.length > 0) {
      const { data: tas, error: taErr } = await supabaseAdmin
        .from("team_accounts")
        .select("user_id")
        .in("user_id", ids);
      if (taErr) throw new Error(taErr.message);
      teamIds = new Set((tas ?? []).map((r) => r.user_id as string));
    }

    const accounts: AdminAccountRow[] = (profileRows ?? []).map((r) => ({
      user_id: r.id as string,
      full_name: (r.full_name as string | null) ?? null,
      account_type: (r.account_type as string | null) ?? null,
      onboarded: (r.onboarded as boolean | null) ?? null,
      is_team_account: teamIds.has(r.id as string),
      created_at: (r.created_at as string | null) ?? null,
    }));

    await logAdminAction(userId, "accounts.list", {
      detail: {
        search: data.search || null,
        limit: data.limit,
        offset: data.offset,
        returned: accounts.length,
      },
    });

    return { accounts, total: count ?? accounts.length };
  });

// ---------------------------------------------------------------------------
// adminGetAccount — metadata for a single account
// ---------------------------------------------------------------------------

interface AdminGetAccountInput {
  userId: string;
}

interface AdminAccountFamilyMembership {
  family_id: string;
  family_name: string;
  role: string | null;
  is_owner: boolean;
}

interface AdminGetAccountResult {
  user_id: string;
  email: string | null;
  full_name: string | null;
  account_type: string | null;
  onboarded: boolean | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  is_team_account: boolean;
  team_account_username: string | null;
  memberships: AdminAccountFamilyMembership[];
}

export const adminGetAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AdminGetAccountInput) => {
    if (!input?.userId || typeof input.userId !== "string")
      throw new Error("userId required");
    return { userId: input.userId };
  })
  .handler(async ({ data, context }): Promise<AdminGetAccountResult> => {
    const { supabase, userId: callerId } = context;
    await assertCallerIsPlatformAdmin(supabase, callerId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, account_type, onboarded, created_at")
      .eq("id", data.userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);

    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (authErr) throw new Error(authErr.message);

    const { data: ta, error: taErr } = await supabaseAdmin
      .from("team_accounts")
      .select("username")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (taErr) throw new Error(taErr.message);

    const { data: mems, error: memErr } = await supabaseAdmin
      .from("family_members")
      .select("family_id, role, families(name, owner_id)")
      .eq("user_id", data.userId);
    if (memErr) throw new Error(memErr.message);

    const memberships: AdminAccountFamilyMembership[] = (mems ?? []).map(
      (m) => {
        const fam = m.families as { name?: string; owner_id?: string } | null;
        return {
          family_id: m.family_id as string,
          family_name: (fam?.name as string) ?? "",
          role: (m.role as string | null) ?? null,
          is_owner: fam?.owner_id === data.userId,
        };
      },
    );

    const result: AdminGetAccountResult = {
      user_id: data.userId,
      email: (authUser?.user?.email as string | null) ?? null,
      full_name: (profile?.full_name as string | null) ?? null,
      account_type: (profile?.account_type as string | null) ?? null,
      onboarded: (profile?.onboarded as boolean | null) ?? null,
      created_at: (profile?.created_at as string | null) ?? null,
      last_sign_in_at:
        (authUser?.user?.last_sign_in_at as string | null) ?? null,
      email_confirmed_at:
        (authUser?.user?.email_confirmed_at as string | null) ?? null,
      is_team_account: !!ta,
      team_account_username: (ta?.username as string | null) ?? null,
      memberships,
    };

    await logAdminAction(callerId, "account.view", {
      target_user_id: data.userId,
      detail: {
        account_type: result.account_type,
        is_team_account: result.is_team_account,
        membership_count: memberships.length,
      },
    });

    return result;
  });

// ---------------------------------------------------------------------------
// adminTriggerPasswordReset — the only mutating admin action
// ---------------------------------------------------------------------------

interface AdminTriggerPasswordResetInput {
  userId: string;
}

interface AdminTriggerPasswordResetResult {
  kind: "recovery_link" | "team_password";
  // For personal accounts: a one-time recovery link the admin can send to
  // the user out-of-band. For team accounts: the new password, returned
  // exactly once. Never logged.
  recoveryLink?: string;
  password?: string;
  username?: string;
}

const PASSWORD_LENGTH = 20;
function generatePassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(PASSWORD_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < PASSWORD_LENGTH; i++)
    out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export const adminTriggerPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AdminTriggerPasswordResetInput) => {
    if (!input?.userId || typeof input.userId !== "string")
      throw new Error("userId required");
    return { userId: input.userId };
  })
  .handler(
    async ({ data, context }): Promise<AdminTriggerPasswordResetResult> => {
      const { supabase, userId: callerId } = context;
      await assertCallerIsPlatformAdmin(supabase, callerId);

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      // Classify target: team account vs personal.
      const { data: ta, error: taErr } = await supabaseAdmin
        .from("team_accounts")
        .select("username")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (taErr) throw new Error(taErr.message);

      if (ta) {
        // Team account: mint a new password, return it once, never log it.
        const password = generatePassword();
        const { error: updErr } =
          await supabaseAdmin.auth.admin.updateUserById(data.userId, {
            password,
          });
        if (updErr)
          throw new Error(`Failed to reset password: ${updErr.message}`);

        await logAdminAction(callerId, "password_reset.team", {
          target_user_id: data.userId,
          detail: {
            account_type: "team",
            // NOTE: password intentionally omitted.
          },
        });

        return {
          kind: "team_password",
          username: (ta.username as string) ?? undefined,
          password,
        };
      }

      // Personal account: look up email, generate a recovery link.
      const { data: authUser, error: authErr } =
        await supabaseAdmin.auth.admin.getUserById(data.userId);
      if (authErr) throw new Error(authErr.message);
      const email = authUser?.user?.email;
      if (!email) throw new Error("Target user has no email address");

      const { data: link, error: linkErr } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
        });
      if (linkErr)
        throw new Error(`Failed to generate recovery link: ${linkErr.message}`);

      const actionLink =
        (link?.properties?.action_link as string | undefined) ?? undefined;

      await logAdminAction(callerId, "password_reset.personal", {
        target_user_id: data.userId,
        detail: {
          account_type: "personal",
          // NOTE: link/token intentionally omitted.
        },
      });

      return { kind: "recovery_link", recoveryLink: actionLink };
    },
  );
