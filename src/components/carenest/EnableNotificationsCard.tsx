import { useTranslation } from "react-i18next";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/lib/push/use-push-subscription";
import { useMyMembership } from "@/lib/auth/use-profile";

export function EnableNotificationsCard() {
  const { t } = useTranslation();
  const membership = useMyMembership();
  const familyId = membership.data?.family_id ?? null;
  const { status, loading, enable, disable } = usePushSubscription(familyId);

  const onEnable = async () => {
    try {
      await enable();
      toast.success(t("push.enabledToast"));
    } catch (e) {
      toast.error((e as Error).message || t("push.enableFailed"));
    }
  };
  const onDisable = async () => {
    try {
      await disable();
      toast.success(t("push.disabledToast"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="card-soft p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          {status === "granted-subscribed" ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold">{t("push.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("push.description")}</p>

          {status === "unsupported" && (
            <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              {t("push.unsupported")}
            </p>
          )}
          {status === "denied" && (
            <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              {t("push.denied")}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {status === "granted-subscribed" ? (
              <Button variant="outline" onClick={onDisable} disabled={loading}>
                <BellOff className="mr-2 h-4 w-4" /> {t("push.disable")}
              </Button>
            ) : (
              <Button onClick={onEnable} disabled={loading || status === "unsupported" || status === "denied" || !familyId}>
                <Bell className="mr-2 h-4 w-4" />
                {loading ? t("push.enabling") : t("push.enable")}
              </Button>
            )}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">{t("push.iosHint")}</p>
        </div>
      </div>
    </div>
  );
}
