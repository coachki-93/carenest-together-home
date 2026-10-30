import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createCheckoutSession,
  createPortalSession,
} from "@/lib/billing/billing.functions";
import { useFamilySubscription } from "@/lib/billing/use-subscription";
import { useMyMembership } from "@/lib/auth/use-profile";
import { toast } from "@/lib/notify";
import { billingErrorKey } from "@/lib/billing/billing-errors";
import { billingPresentation, billingStatus } from "@/lib/billing/subscription-state";

interface Props {
  familyId: string;
  isOwner: boolean;
}

/**
 * Owner-only billing card. Non-owners see nothing.
 * - Trialing/active/past-due/canceled/none each show a distinct status line.
 * - Subscribe → Stripe Checkout. Manage → Stripe Customer Portal.
 * - The server enforces owner-gate BEFORE creating either session; this
 *   UI-level `isOwner` check is defense-in-depth.
 */
export function BillingCard({ familyId, isOwner }: Props) {
  const { t, i18n } = useTranslation();
  const sub = useFamilySubscription(familyId);
  const membership = useMyMembership();
  const checkoutFn = useServerFn(createCheckoutSession);
  const portalFn = useServerFn(createPortalSession);
  const [redirecting, setRedirecting] = useState(false);
  const [customerMissing, setCustomerMissing] = useState(false);

  const startCheckout = useMutation({
    mutationFn: async () => {
      const origin = window.location.origin;
      return checkoutFn({
        data: {
          familyId,
          successUrl: `${origin}/billing?billing=success`,
          cancelUrl: `${origin}/billing?billing=canceled`,
        },
      });
    },
    onSuccess: (res) => {
      setRedirecting(true);
      window.location.assign(res.url);
    },
    onError: (e: Error) => toast.error(t(billingErrorKey(e))),
    meta: { suppressGlobalError: true },
  });

  const openPortal = useMutation({
    mutationFn: async () => {
      const origin = window.location.origin;
      return portalFn({
        data: { familyId, returnUrl: `${origin}/billing` },
      });
    },
    onSuccess: (res) => {
      setRedirecting(true);
      window.location.assign(res.url);
    },
    onError: (e: Error) => {
      if (e.message === "customer_not_found") setCustomerMissing(true);
      toast.error(t(billingErrorKey(e)));
    },
    meta: { suppressGlobalError: true },
  });

  if (!isOwner) return null;

  const s = sub.data;
  const hasCustomer = !!s?.row?.stripe_customer_id && !customerMissing;
  const family = membership.data?.family_id === familyId ? membership.data.families : null;
  const presentation = billingPresentation(s, family?.founding_member === true);
  const founding = presentation.plan === "founding";
  const hasSubscription = presentation.primaryAction === "manage";
  const dateFmt = new Intl.DateTimeFormat(
    i18n.language?.startsWith("sv") ? "sv-SE" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <section className="card-soft p-6 md:p-8 space-y-4">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <CreditCard className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t("billing.card.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("billing.card.subtitle")}
          </p>
        </div>
      </header>

      {sub.isLoading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {t("common.loading")}
        </div>
      ) : (
        <div className="space-y-3">
          <StatusLine
            state={s}
            dateFmt={dateFmt}
            foundingRateLine={
              founding && hasSubscription ? t("billing.card.foundingLocked") : null
            }
          />

          <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-semibold">
                {founding
                    ? t("billing.card.foundingPlan")
                    : t("billing.card.standardPlan")}
              </span>
              <span className="tabular-nums">{t("billing.card.monthlyPrice", { price: presentation.priceKr })}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("billing.card.monthlyOnly")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {hasSubscription ? (
              <Button
                onClick={() => openPortal.mutate()}
                disabled={openPortal.isPending || redirecting}
                className="rounded-full"
              >
                {(openPortal.isPending || redirecting) && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {t("billing.card.managePortal")}
              </Button>
            ) : (
              <Button
                onClick={() => startCheckout.mutate()}
                disabled={startCheckout.isPending || redirecting}
                className="rounded-full"
              >
                {(startCheckout.isPending || redirecting) && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {t("billing.card.subscribe")}
              </Button>
            )}
            {presentation.showHistory && hasCustomer && (
              <Button
                variant="link"
                onClick={() => openPortal.mutate()}
                disabled={openPortal.isPending || redirecting}
              >
                {openPortal.isPending && <Loader2 className="size-4 animate-spin" />}
                {t("billing.card.historyLink")}
              </Button>
            )}
          </div>
          {customerMissing && <p className="text-sm text-muted-foreground">{t("billing.errors.customerNotFound")}</p>}

          {hasSubscription && hasCustomer && (
            <p className="text-xs text-muted-foreground">
              {t("billing.card.historyHint")}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            {t("billing.card.dataPreserved")}
          </p>
        </div>
      )}
    </section>
  );
}

function StatusLine({
  state,
  dateFmt,
  foundingRateLine,
}: {
  state: ReturnType<typeof useFamilySubscription>["data"];
  dateFmt: Intl.DateTimeFormat;
  foundingRateLine: string | null;
}) {
  const { t } = useTranslation();
  if (!state) return null;
  const { row } = state;
  const status = billingStatus(state);
  let line: string;
  if (status === "none") {
    line = t("billing.card.statusNone");
  } else if (status === "expired" && state.endsAt) {
    line = t("billing.card.statusExpired", { date: dateFmt.format(state.endsAt) });
  } else if (state.isTrial && state.endsAt) {
    line = t("billing.card.statusTrial", {
      date: dateFmt.format(state.endsAt),
      count: state.daysRemaining ?? 0,
    });
  } else if ((status === "active" || status === "cancelScheduled") && state.endsAt) {
    line = status === "cancelScheduled"
      ? t("billing.card.statusCancelsAt", { date: dateFmt.format(state.endsAt) })
      : t("billing.card.statusActive", { date: dateFmt.format(state.endsAt) });
  } else if (state.isPastDue && state.endsAt) {
    line = t("billing.card.statusPastDue", { date: dateFmt.format(state.endsAt) });
  } else if (row?.status === "canceled") {
    line = t("billing.card.statusCanceled");
  } else {
    line = t("billing.card.statusInactive");
  }
  return (
    <div className="space-y-1">
      <p className="text-sm">{line}</p>
      {foundingRateLine && (
        <p className="text-xs text-primary font-medium">{foundingRateLine}</p>
      )}
    </div>
  );
}
