import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Platform-admin subscription/revenue analytics (read-only).
 *
 * Kept OUT of admin.functions.ts on purpose: that module is restricted to the
 * metadata allow-list by scripts/check-admin-minimization.sh. This module adds
 * family_subscriptions (billing metadata — never health data) and is itself
 * guarded by the same script.
 *
 * Contract (mirrors billing-admin / bug-admin):
 *  - requireSupabaseAuth + assertCallerIsPlatformAdmin against the caller's
 *    RLS-scoped client BEFORE any supabaseAdmin escalation.
 *  - Explicit columns only — no select("*").
 *  - Strictly read-only: no writes to subscription data, ever.
 *  - One admin_audit_log row per view.
 */

const PRICE_FOUNDING_SEK = 199;
const PRICE_STANDARD_SEK = 299;
const LIST_LIMIT = 50;

async function assertCallerIsPlatformAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
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
    detail?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action,
      target_family_id: fields.target_family_id ?? null,
      target_user_id: null,
      detail: (fields.detail ?? {}) as never,
    });
  } catch (e) {
    console.error("[admin] audit log write failed", e);
  }
}

export interface AdminTrialEndingRow {
  familyId: string;
  familyName: string;
  trialEndsAt: string;
}

export interface AdminScheduledCancelRow {
  familyId: string;
  familyName: string;
  currentPeriodEnd: string | null;
}

export interface AdminSubscriptionAnalytics {
  statusCounts: {
    active: number;
    trialing: number;
    canceled: number;
    past_due: number;
    none: number;
  };
  activeFounding: number;
  activeStandard: number;
  mrrSek: number;
  arrSek: number;
  signups30d: number;
  trialsEndingSoon: AdminTrialEndingRow[];
  trialsEndingSoonCount: number;
  scheduledCancels: AdminScheduledCancelRow[];
  scheduledCancelsCount: number;
}

const SUB_COLUMNS =
  "family_id, status, plan, trial_ends_at, current_period_end, cancel_at_period_end, created_at";

export const adminGetSubscriptionAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminSubscriptionAnalytics> => {
    const { supabase, userId } = context;
    await assertCallerIsPlatformAdmin(supabase, userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: subs, error: subErr } = await supabaseAdmin
      .from("family_subscriptions")
      .select(SUB_COLUMNS);
    if (subErr) throw new Error(subErr.message);

    const { data: fams, error: famErr } = await supabaseAdmin
      .from("families")
      .select("id, name, founding_member");
    if (famErr) throw new Error(famErr.message);

    const famById = new Map(
      (fams ?? []).map((f) => [
        f.id as string,
        {
          name: (f.name as string) ?? "",
          founding: f.founding_member === true,
        },
      ]),
    );

    const statusCounts = {
      active: 0,
      trialing: 0,
      canceled: 0,
      past_due: 0,
      none: 0,
    };
    let activeFounding = 0;
    let activeStandard = 0;
    let signups30d = 0;
    const trialsEndingSoon: AdminTrialEndingRow[] = [];
    const scheduledCancels: AdminScheduledCancelRow[] = [];

    const now = Date.now();
    const in7d = now + 7 * 24 * 60 * 60 * 1000;
    const ago30d = now - 30 * 24 * 60 * 60 * 1000;

    for (const s of subs ?? []) {
      const status = (s.status as keyof typeof statusCounts) ?? "none";
      if (status in statusCounts) statusCounts[status] += 1;

      const fam = famById.get(s.family_id as string);
      const famName = fam?.name ?? "";

      if (status === "active") {
        if (fam?.founding) activeFounding += 1;
        else activeStandard += 1;
      }

      if (s.created_at && new Date(s.created_at as string).getTime() >= ago30d) {
        signups30d += 1;
      }

      if (status === "trialing" && s.trial_ends_at) {
        const t = new Date(s.trial_ends_at as string).getTime();
        if (t >= now && t <= in7d) {
          trialsEndingSoon.push({
            familyId: s.family_id as string,
            familyName: famName,
            trialEndsAt: s.trial_ends_at as string,
          });
        }
      }

      if (s.cancel_at_period_end === true) {
        scheduledCancels.push({
          familyId: s.family_id as string,
          familyName: famName,
          currentPeriodEnd: (s.current_period_end as string | null) ?? null,
        });
      }
    }

    trialsEndingSoon.sort((a, b) => a.trialEndsAt.localeCompare(b.trialEndsAt));
    scheduledCancels.sort((a, b) =>
      (a.currentPeriodEnd ?? "").localeCompare(b.currentPeriodEnd ?? ""),
    );

    const mrrSek =
      activeFounding * PRICE_FOUNDING_SEK + activeStandard * PRICE_STANDARD_SEK;

    const result: AdminSubscriptionAnalytics = {
      statusCounts,
      activeFounding,
      activeStandard,
      mrrSek,
      arrSek: mrrSek * 12,
      signups30d,
      trialsEndingSoonCount: trialsEndingSoon.length,
      trialsEndingSoon: trialsEndingSoon.slice(0, LIST_LIMIT),
      scheduledCancelsCount: scheduledCancels.length,
      scheduledCancels: scheduledCancels.slice(0, LIST_LIMIT),
    };

    await logAdminAction(userId, "analytics.subscriptions.view", {
      detail: {
        active: statusCounts.active,
        trialing: statusCounts.trialing,
        mrr_sek: result.mrrSek,
      },
    });

    return result;
  });

export interface AdminFamilySubscriptionDTO {
  familyId: string;
  status: string | null;
  plan: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}

const FamilySubSchema = z.object({ familyId: z.string().uuid() });

export const adminGetFamilySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FamilySubSchema.parse(input))
  .handler(
    async ({ data, context }): Promise<AdminFamilySubscriptionDTO | null> => {
      const { supabase, userId } = context;
      await assertCallerIsPlatformAdmin(supabase, userId);

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const { data: row, error } = await supabaseAdmin
        .from("family_subscriptions")
        .select(
          "family_id, status, plan, stripe_customer_id, stripe_subscription_id, current_period_end, trial_ends_at, cancel_at_period_end",
        )
        .eq("family_id", data.familyId)
        .maybeSingle();
      if (error) throw new Error(error.message);

      await logAdminAction(userId, "analytics.family_subscription.view", {
        target_family_id: data.familyId,
        detail: { found: !!row },
      });

      if (!row) return null;

      return {
        familyId: row.family_id as string,
        status: (row.status as string | null) ?? null,
        plan: (row.plan as string | null) ?? null,
        stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
        stripeSubscriptionId:
          (row.stripe_subscription_id as string | null) ?? null,
        currentPeriodEnd: (row.current_period_end as string | null) ?? null,
        trialEndsAt: (row.trial_ends_at as string | null) ?? null,
        cancelAtPeriodEnd: row.cancel_at_period_end === true,
      };
    },
  );

// ---------------------------------------------------------------------------
// Support diagnostics (read-only)
//
// Notification-delivery + device metadata only. Health content NEVER appears
// here: "last active" and "recent send attempts" are computed inside the
// SECURITY DEFINER functions family_last_active / family_notification_attempts,
// which return only timestamps and the pass label.
// ---------------------------------------------------------------------------

export interface AdminPushDevice {
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface AdminDiagMember {
  userId: string;
  name: string;
  hasPush: boolean;
  devices: AdminPushDevice[];
}

export interface AdminNotificationAttempt {
  occurrenceAt: string;
  pass: string;
  notifiedAt: string;
}

export interface AdminFamilyDiagnostics {
  familyId: string;
  lastActiveAt: string | null;
  members: AdminDiagMember[];
  recentAttempts: AdminNotificationAttempt[];
}

const DiagSchema = z.object({ familyId: z.string().uuid() });

export const adminGetFamilyDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DiagSchema.parse(input))
  .handler(async ({ data, context }): Promise<AdminFamilyDiagnostics> => {
    const { supabase, userId } = context;
    await assertCallerIsPlatformAdmin(supabase, userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: members, error: memErr } = await supabaseAdmin
      .from("family_members")
      .select("user_id")
      .eq("family_id", data.familyId);
    if (memErr) throw new Error(memErr.message);

    const userIds = (members ?? []).map((m) => m.user_id as string);

    const { data: profiles, error: profErr } = userIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
      : { data: [], error: null };
    if (profErr) throw new Error(profErr.message);

    const { data: subs, error: subErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("user_id, user_agent, created_at, last_seen_at")
      .eq("family_id", data.familyId);
    if (subErr) throw new Error(subErr.message);

    const nameById = new Map(
      (profiles ?? []).map((p) => [
        p.id as string,
        (p.full_name as string) ?? "",
      ]),
    );

    const devicesByUser = new Map<string, AdminPushDevice[]>();
    for (const s of subs ?? []) {
      const uid = s.user_id as string;
      const list = devicesByUser.get(uid) ?? [];
      list.push({
        userAgent: (s.user_agent as string | null) ?? null,
        createdAt: s.created_at as string,
        lastSeenAt: s.last_seen_at as string,
      });
      devicesByUser.set(uid, list);
    }

    const memberRows: AdminDiagMember[] = userIds.map((uid) => {
      const devices = (devicesByUser.get(uid) ?? []).sort((a, b) =>
        b.lastSeenAt.localeCompare(a.lastSeenAt),
      );
      return {
        userId: uid,
        name: nameById.get(uid) ?? "",
        hasPush: devices.length > 0,
        devices,
      };
    });

    const { data: lastActive, error: laErr } = await supabaseAdmin.rpc(
      "family_last_active",
      { _family_id: data.familyId },
    );
    if (laErr) throw new Error(laErr.message);

    const { data: attempts, error: atErr } = await supabaseAdmin.rpc(
      "family_notification_attempts",
      { _family_id: data.familyId, _limit: 20 },
    );
    if (atErr) throw new Error(atErr.message);

    const recentAttempts: AdminNotificationAttempt[] = (attempts ?? []).map(
      (a) => ({
        occurrenceAt: a.occurrence_at as string,
        pass: (a.pass as string) ?? "",
        notifiedAt: a.notified_at as string,
      }),
    );

    await logAdminAction(userId, "diagnostics.family.view", {
      target_family_id: data.familyId,
      detail: {
        members: memberRows.length,
        with_push: memberRows.filter((m) => m.hasPush).length,
        attempts: recentAttempts.length,
      },
    });

    return {
      familyId: data.familyId,
      lastActiveAt: (lastActive as string | null) ?? null,
      members: memberRows,
      recentAttempts,
    };
  });
