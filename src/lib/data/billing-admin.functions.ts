import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Platform-admin billing (coupon) server functions.
 *
 * Data-minimization contract (mirrors admin.functions.ts, enforced by
 * scripts/check-admin-minimization.sh):
 *  - Touches ONLY Stripe (via stripe.server) and admin_audit_log.
 *  - No health tables. No dynamic SQL. No .rpc() beyond is_platform_admin.
 *  - Every entry point runs assertCallerIsPlatformAdmin against the caller's
 *    RLS-scoped client BEFORE any Stripe call or supabaseAdmin escalation.
 *  - Every action writes one row to admin_audit_log via supabaseAdmin. detail
 *    contains code + percent + duration only — no sensitive data.
 *
 * Stripe is the source of truth for coupons — we never mirror them in our DB.
 * Redemption counts, active flags, etc. are read live via adminListCoupons.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action,
      target_family_id: null,
      target_user_id: null,
      detail: detail as never,
    });
  } catch (e) {
    console.error("[admin] audit log write failed", e);
  }
}

// ---------------------------------------------------------------------------
// Shared DTO
// ---------------------------------------------------------------------------

export interface AdminCouponDTO {
  promotionCodeId: string;
  couponId: string;
  code: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  percentOff: number | null;
  duration: "once" | "repeating" | "forever";
  durationInMonths: number | null;
  created: string; // ISO
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCouponDTO(promo: any, couponOverride?: any): AdminCouponDTO {
  // Only trust couponOverride when it is a real object — guards against
  // accidental positional args (e.g. Array#map's index).
  const rawCoupon =
    couponOverride && typeof couponOverride === "object"
      ? couponOverride
      : promo.promotion && typeof promo.promotion === "object"
        ? promo.promotion.coupon
        : promo.coupon;
  const coupon = rawCoupon && typeof rawCoupon === "object" ? rawCoupon : {};
  return {
    promotionCodeId: String(promo.id),
    couponId: String(
      coupon.id ??
        (typeof rawCoupon === "string" ? rawCoupon : ""),
    ),
    code: String(promo.code ?? ""),
    active: promo.active !== false,
    timesRedeemed: Number(promo.times_redeemed ?? 0),
    maxRedemptions:
      promo.max_redemptions == null ? null : Number(promo.max_redemptions),
    percentOff:
      coupon.percent_off == null ? null : Number(coupon.percent_off),
    duration: (coupon.duration ?? "once") as
      | "once"
      | "repeating"
      | "forever",
    durationInMonths:
      coupon.duration_in_months == null
        ? null
        : Number(coupon.duration_in_months),
    created: promo.created
      ? new Date(Number(promo.created) * 1000).toISOString()
      : new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// adminCreateCoupon
// ---------------------------------------------------------------------------

const CreateCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "code must be alphanumeric / _ / -")
      .transform((s) => s.toUpperCase()),
    percentOff: z.number().int().min(10).max(100),
    duration: z.enum(["once", "repeating", "forever"]),
    durationInMonths: z.number().int().min(1).max(36).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.duration === "repeating" && v.durationInMonths == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "durationInMonths required when duration=repeating",
        path: ["durationInMonths"],
      });
    }
    if (v.duration !== "repeating" && v.durationInMonths != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "durationInMonths only valid when duration=repeating",
        path: ["durationInMonths"],
      });
    }
  });

export const adminCreateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateCouponSchema.parse(input))
  .handler(async ({ data, context }): Promise<AdminCouponDTO> => {
    const { supabase, userId } = context;
    await assertCallerIsPlatformAdmin(supabase, userId);

    const { getStripeClient } = await import("@/lib/billing/stripe.server");
    const stripe = getStripeClient();

    const coupon = await stripe.coupons.create({
      percent_off: data.percentOff,
      duration: data.duration,
      ...(data.duration === "repeating"
        ? { duration_in_months: data.durationInMonths }
        : {}),
      name: data.code,
      metadata: { created_by_admin: userId },
    });

    let promo;
    try {
      promo = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: coupon.id },
        code: data.code,
        metadata: { created_by_admin: userId },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Clean up the dangling coupon so retries can reuse the same code.
      try {
        await stripe.coupons.del(coupon.id);
      } catch {
        // best-effort cleanup
      }
      if (/already exists|code_already_exists/i.test(msg)) {
        throw new Error(`Promotion code "${data.code}" already exists`);
      }
      throw new Error(`Failed to create promotion code: ${msg}`);
    }

    const dto = toCouponDTO(promo, coupon);

    await logAdminAction(userId, "coupon.create", {
      code: dto.code,
      percent_off: dto.percentOff,
      duration: dto.duration,
      duration_in_months: dto.durationInMonths,
      promotion_code_id: dto.promotionCodeId,
      coupon_id: dto.couponId,
    });

    return dto;
  });

// ---------------------------------------------------------------------------
// adminListCoupons
// ---------------------------------------------------------------------------

export const adminListCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ coupons: AdminCouponDTO[] }> => {
    const { supabase, userId } = context;
    await assertCallerIsPlatformAdmin(supabase, userId);

    const { getStripeClient } = await import("@/lib/billing/stripe.server");
    const stripe = getStripeClient();

    const list = await stripe.promotionCodes.list({
      limit: 100,
      expand: ["data.promotion.coupon"],
    });

    const coupons = list.data.map(toCouponDTO);

    await logAdminAction(userId, "coupon.list", {
      returned: coupons.length,
    });

    return { coupons };
  });

// ---------------------------------------------------------------------------
// adminDeactivateCoupon
// ---------------------------------------------------------------------------

const DeactivateCouponSchema = z.object({
  promotionCodeId: z
    .string()
    .trim()
    .regex(/^promo_[A-Za-z0-9]+$/, "invalid promotion code id"),
});

export const adminDeactivateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeactivateCouponSchema.parse(input))
  .handler(async ({ data, context }): Promise<AdminCouponDTO> => {
    const { supabase, userId } = context;
    await assertCallerIsPlatformAdmin(supabase, userId);

    const { getStripeClient } = await import("@/lib/billing/stripe.server");
    const stripe = getStripeClient();

    const promo = await stripe.promotionCodes.update(data.promotionCodeId, {
      active: false,
    });

    // Fetch the coupon so the returned DTO is consistent with list/create.
    const rawCoupon = promo.promotion?.coupon;
    const couponId =
      typeof rawCoupon === "string" ? rawCoupon : rawCoupon?.id ?? null;
    const coupon = couponId ? await stripe.coupons.retrieve(couponId) : rawCoupon;

    const dto = toCouponDTO(promo, coupon);

    await logAdminAction(userId, "coupon.deactivate", {
      promotion_code_id: dto.promotionCodeId,
      code: dto.code,
    });

    return dto;
  });
