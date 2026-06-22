import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/lib/push/use-push-subscription";
import { useMyMembership } from "@/lib/auth/use-profile";

type IosDiag = {
  isIos: boolean;
  standalone: boolean;
  permission: NotificationPermission | "unknown";
  swSupported: boolean;
  pushSupported: boolean;
};

export function EnableNotificationsCard() {
  const { t } = useTranslation();
  const membership = useMyMembership();
  const familyId = membership.data?.family_id ?? null;
  const { status, loading, enable, disable } = usePushSubscription(familyId);
  const [diag, setDiag] = useState<IosDiag | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS-only
      window.navigator.standalone === true;
    setDiag({
      isIos,
      standalone,
      permission: "Notification" in window ? Notification.permission : "unknown",
      swSupported: "serviceWorker" in navigator,
      pushSupported: "PushManager" in window,
    });
  }, [status]);


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

          {diag && (diag.isIos || status !== "granted-subscribed") && (
            <details className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium">{t("push.diagnostics")}</summary>
              <ul className="mt-2 space-y-1">
                <li>iOS: {diag.isIos ? "yes" : "no"}</li>
                <li>Installed (home-screen): {diag.standalone ? "yes" : "no"}</li>
                <li>Permission: {diag.permission}</li>
                <li>Service Worker supported: {diag.swSupported ? "yes" : "no"}</li>
                <li>Push supported: {diag.pushSupported ? "yes" : "no"}</li>
                <li>Status: {status}</li>
              </ul>
              {diag.isIos && !diag.standalone && (
                <p className="mt-2 text-destructive">{t("push.iosNotStandalone")}</p>
              )}
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
