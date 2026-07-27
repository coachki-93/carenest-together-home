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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const membership = useMyMembership();
  const familyId = membership.data?.family_id;
  const isOwner = membership.data?.role === "owner";
  const sub = useFamilySubscription(familyId);

  const view = useMemo(() => {
    const s = sub.data;
    if (!s) return null;
    if (s.isActive && !s.isTrial && !s.isPastDue && !s.isCanceled) return null;
    if (s.isTrial) {
      return {
        tone: "info" as const,
        icon: Clock,
        message: t("billing.banner.trial", { count: s.daysRemaining ?? 0 }),
      };
    }
    if (s.isPastDue) {
      return {
        tone: "warn" as const,
        icon: AlertTriangle,
        message: t("billing.banner.pastDue"),
      };
    }
    return {
      tone: "warn" as const,
      icon: Lock,
      message: t("billing.banner.readOnly"),
    };
  }, [sub.data, t]);

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
          onClick={() => navigate({ to: "/settings" })}
        >
          {t("billing.banner.manage")}
        </Button>
      )}
    </div>
  );
}
