import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyMembership } from "@/lib/auth/use-profile";
import { useFamilySubscription } from "@/lib/billing/use-subscription";

/**
 * Renders a slim banner above the dashboard when the family's subscription
 * is trialing (days left), past-due, canceled, or missing. Owners see a
 * "Manage billing" CTA; other members see an explanatory line only.
 * Hidden entirely for healthy active subscriptions.
 */
export function SubscriptionBanner() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const membership = useMyMembership();
  const familyId = membership.data?.family_id;
  const isOwner = membership.data?.role === "owner";
  const sub = useFamilySubscription(familyId);

  const view = useMemo(() => {
    const s = sub.data;
    if (!s) return null;
    if (s.isActive && !s.isTrial && !s.isPastDue && !s.isCanceled) return null;
    const dateFmt = new Intl.DateTimeFormat(
      i18n.language?.startsWith("sv") ? "sv-SE" : "en-GB",
      { day: "numeric", month: "long", year: "numeric" },
    );
    if (s.isTrial) {
      return {
        tone: "info" as const,
        icon: Clock,
        cta: "default" as const,
        message: t("billing.banner.trial", { count: s.daysRemaining ?? 0 }),
      };
    }
    // Active but scheduled to cancel: full access remains until the end date,
    // so this must NOT use the red read-only treatment.
    if (s.isActive && s.isCanceled) {
      return {
        tone: "info" as const,
        icon: Clock,
        cta: "resubscribe" as const,
        message: t("billing.banner.cancelScheduled", {
          date: s.endsAt ? dateFmt.format(s.endsAt) : "",
        }),
      };
    }
    if (s.isPastDue) {
      return {
        tone: "warn" as const,
        icon: AlertTriangle,
        cta: "default" as const,
        message: t("billing.banner.pastDue"),
      };
    }
    // Only reachable when !s.isActive — genuinely read-only.
    return {
      tone: "warn" as const,
      icon: Lock,
      cta: "default" as const,
      message: t("billing.banner.readOnly"),
    };
  }, [sub.data, t, i18n.language]);

  if (!view || !familyId) return null;

  const Icon = view.icon;
  const toneClass =
    view.tone === "warn"
      ? "border-red-300 bg-red-50 text-red-900"
      : "border-amber-300 bg-amber-50 text-amber-900";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 mb-4 ${toneClass}`}
      role="status"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <p className="text-sm font-medium flex-1">{view.message}</p>
      {isOwner && (
        <Button
          size="sm"
          variant="outline"
          className="rounded-full bg-white"
          onClick={() => navigate({ to: "/billing" })}
        >
          {view.cta === "resubscribe"
            ? t("billing.banner.resubscribe")
            : sub.data?.row?.stripe_customer_id
              ? t("billing.banner.manage")
              : t("billing.banner.subscribe")}
        </Button>
      )}
    </div>
  );
}
