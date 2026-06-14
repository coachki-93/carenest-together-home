import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CaregiverProfile } from "@/lib/data/caregiver-profiles";

export type TaskAction = "done" | "skipped" | "postponed";

export interface TaskActionResult {
  action: TaskAction;
  caregiverProfileId: string | null;
  reason: string | null;
  postponedTo: Date | null;
}

export function TaskActionDialog({
  open,
  onOpenChange,
  action,
  title,
  scheduledFor,
  profiles,
  defaultProfileId,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  action: TaskAction | null;
  title: string;
  scheduledFor: Date;
  profiles: CaregiverProfile[];
  defaultProfileId: string | null;
  onConfirm: (result: TaskActionResult) => void | Promise<void>;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [profileId, setProfileId] = useState<string | null>(defaultProfileId);
  const [reason, setReason] = useState("");
  const [postponedDate, setPostponedDate] = useState("");
  const [postponedTime, setPostponedTime] = useState("");

  useEffect(() => {
    if (!open) return;
    setProfileId(defaultProfileId);
    setReason("");
    // Default postpone to scheduled + 1 hour, local
    const t = new Date(scheduledFor.getTime() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    setPostponedDate(
      `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`,
    );
    setPostponedTime(`${pad(t.getHours())}:${pad(t.getMinutes())}`);
  }, [open, defaultProfileId, scheduledFor]);

  if (!action) return null;

  const reasonRequired = action === "skipped" || action === "postponed";
  const showProfile = action === "done";
  const showPostpone = action === "postponed";

  const heading =
    action === "done"
      ? t("taskAction.doneTitle")
      : action === "skipped"
        ? t("taskAction.skipTitle")
        : t("taskAction.postponeTitle");

  const description =
    action === "done"
      ? t("taskAction.doneBody", { title })
      : action === "skipped"
        ? t("taskAction.skipBody", { title })
        : t("taskAction.postponeBody", { title });

  const submitLabel =
    action === "done"
      ? t("taskAction.confirmDone")
      : action === "skipped"
        ? t("taskAction.confirmSkip")
        : t("taskAction.confirmPostpone");

  const trimmedReason = reason.trim();
  const canSubmit =
    !submitting &&
    (!reasonRequired || trimmedReason.length > 0) &&
    (!showPostpone || (!!postponedDate && !!postponedTime));

  async function submit() {
    let postponedTo: Date | null = null;
    if (showPostpone) {
      const [y, m, d] = postponedDate.split("-").map(Number);
      const [hh, mm] = postponedTime.split(":").map(Number);
      postponedTo = new Date(y, (m ?? 1) - 1, d, hh ?? 0, mm ?? 0, 0, 0);
    }
    await onConfirm({
      action,
      caregiverProfileId: showProfile ? profileId : null,
      reason: trimmedReason ? trimmedReason : null,
      postponedTo,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showProfile && (
            <div className="space-y-1.5">
              <Label>{t("taskAction.completedBy")}</Label>
              <Select
                value={profileId ?? ""}
                onValueChange={(v) => setProfileId(v || null)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("taskAction.selectProfile")} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {t("taskAction.noProfiles")}
                    </SelectItem>
                  ) : (
                    profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block size-2.5 rounded-full"
                            style={{ backgroundColor: p.color ?? "#A78BFA" }}
                          />
                          {p.name}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {showPostpone && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>{t("taskAction.newDate")}</Label>
                <Input
                  type="date"
                  className="rounded-xl"
                  value={postponedDate}
                  onChange={(e) => setPostponedDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("taskAction.newTime")}</Label>
                <Input
                  type="time"
                  className="rounded-xl"
                  value={postponedTime}
                  onChange={(e) => setPostponedTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {reasonRequired && (
            <div className="space-y-1.5">
              <Label>
                {t("taskAction.reasonLabel")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                className="rounded-xl"
                placeholder={t("taskAction.reasonPlaceholder")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            className="rounded-full"
            onClick={submit}
            disabled={!canSubmit}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
