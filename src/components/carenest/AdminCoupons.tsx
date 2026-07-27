import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, Ticket, Plus, PowerOff } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminCreateCoupon,
  adminListCoupons,
  adminDeactivateCoupon,
  type AdminCouponDTO,
} from "@/lib/data/billing-admin.functions";
import { toast } from "@/lib/notify";

// Mirror server bounds (billing-admin.functions.ts CreateCouponSchema).
const clientSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/),
    percentOff: z.number().int().min(10).max(100),
    duration: z.enum(["once", "repeating", "forever"]),
    durationInMonths: z.number().int().min(1).max(36).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.duration === "repeating" && v.durationInMonths == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationInMonths"],
        message: "required",
      });
    }
  });

export function AdminCoupons() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const list = useServerFn(adminListCoupons);
  const create = useServerFn(adminCreateCoupon);
  const deactivate = useServerFn(adminDeactivateCoupon);

  const q = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: () => list(),
  });

  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState<number>(20);
  const [duration, setDuration] = useState<"once" | "repeating" | "forever">(
    "once",
  );
  const [months, setMonths] = useState<number>(3);
  const [formError, setFormError] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<AdminCouponDTO | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: {
      code: string;
      percentOff: number;
      duration: "once" | "repeating" | "forever";
      durationInMonths?: number;
    }) => create({ data: payload }),
    onSuccess: () => {
      toast.success(t("admin.coupons.created"));
      setCode("");
      setPercentOff(20);
      setDuration("once");
      setMonths(3);
      setFormError(null);
      void qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deactivateMut = useMutation({
    mutationFn: (promotionCodeId: string) =>
      deactivate({ data: { promotionCodeId } }),
    onSuccess: () => {
      toast.success(t("admin.coupons.deactivated"));
      setDeactivateTarget(null);
      void qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      code,
      percentOff,
      duration,
      ...(duration === "repeating" ? { durationInMonths: months } : {}),
    };
    const parsed = clientSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setFormError(null);
    createMut.mutate({ ...parsed.data, code: parsed.data.code.toUpperCase() });
  }

  function fmtDuration(c: AdminCouponDTO): string {
    if (c.duration === "forever") return t("admin.coupons.durForever");
    if (c.duration === "once") return t("admin.coupons.durOnce");
    return t("admin.coupons.durRepeatingN", {
      count: c.durationInMonths ?? 0,
    });
  }

  return (
    <div className="space-y-6">
      <section className="card-soft p-5 md:p-6 space-y-4 border-amber-200/60">
        <header className="flex items-center gap-3">
          <Plus className="size-5 text-amber-700" />
          <h2 className="text-lg font-bold">{t("admin.coupons.createTitle")}</h2>
        </header>
        <p className="text-sm text-muted-foreground">
          {t("admin.coupons.createHint")}
        </p>
        <form
          onSubmit={onSubmit}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="coupon-code">{t("admin.coupons.fieldCode")}</Label>
            <Input
              id="coupon-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="HARDSHIP50"
              maxLength={40}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coupon-percent">
              {t("admin.coupons.fieldPercent")}
            </Label>
            <Input
              id="coupon-percent"
              type="number"
              min={10}
              max={100}
              value={percentOff}
              onChange={(e) =>
                setPercentOff(Number.parseInt(e.target.value, 10) || 0)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.coupons.fieldDuration")}</Label>
            <Select
              value={duration}
              onValueChange={(v) =>
                setDuration(v as "once" | "repeating" | "forever")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">
                  {t("admin.coupons.durOnce")}
                </SelectItem>
                <SelectItem value="repeating">
                  {t("admin.coupons.durRepeating")}
                </SelectItem>
                <SelectItem value="forever">
                  {t("admin.coupons.durForever")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {duration === "repeating" && (
            <div className="space-y-1.5">
              <Label htmlFor="coupon-months">
                {t("admin.coupons.fieldMonths")}
              </Label>
              <Input
                id="coupon-months"
                type="number"
                min={1}
                max={36}
                value={months}
                onChange={(e) =>
                  setMonths(Number.parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
          )}
          <div className="md:col-span-2 lg:col-span-4 flex items-center justify-between gap-4">
            {formError ? (
              <p className="text-sm text-red-700">{formError}</p>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("admin.coupons.rules")}
              </span>
            )}
            <Button
              type="submit"
              disabled={createMut.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {createMut.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t("admin.coupons.createCta")}
            </Button>
          </div>
        </form>
      </section>

      <section className="card-soft p-5 md:p-6 space-y-4">
        <header className="flex items-center gap-3">
          <Ticket className="size-5 text-amber-700" />
          <h2 className="text-lg font-bold">{t("admin.coupons.listTitle")}</h2>
        </header>
        {q.isLoading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : q.isError ? (
          <p className="text-sm text-red-700">{(q.error as Error).message}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">{t("admin.coupons.colCode")}</th>
                  <th className="py-2 pr-4">{t("admin.coupons.colDiscount")}</th>
                  <th className="py-2 pr-4">{t("admin.coupons.colDuration")}</th>
                  <th className="py-2 pr-4">
                    {t("admin.coupons.colRedeemed")}
                  </th>
                  <th className="py-2 pr-4">{t("admin.coupons.colStatus")}</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {q.data?.coupons.map((c) => (
                  <tr key={c.promotionCodeId} className="border-t">
                    <td className="py-2 pr-4 font-mono font-semibold">
                      {c.code}
                    </td>
                    <td className="py-2 pr-4">{c.percentOff ?? "—"}%</td>
                    <td className="py-2 pr-4">{fmtDuration(c)}</td>
                    <td className="py-2 pr-4">{c.timesRedeemed}</td>
                    <td className="py-2 pr-4">
                      {c.active ? (
                        <span className="text-emerald-700 font-semibold">
                          {t("admin.coupons.active")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("admin.coupons.inactive")}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {c.active && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setDeactivateTarget(c)}
                        >
                          <PowerOff className="size-3.5" />
                          {t("admin.coupons.deactivate")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {q.data && q.data.coupons.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-muted-foreground">
                      {t("admin.coupons.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.coupons.deactivateTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.coupons.deactivateBody", {
                code: deactivateTarget?.code ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeactivateTarget(null)}
              disabled={deactivateMut.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() =>
                deactivateTarget &&
                deactivateMut.mutate(deactivateTarget.promotionCodeId)
              }
              disabled={deactivateMut.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {deactivateMut.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t("admin.coupons.deactivateCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
