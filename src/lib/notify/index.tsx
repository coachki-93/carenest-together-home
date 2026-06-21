import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type NotifyVariant = "success" | "error" | "warning" | "info";

export interface NotifyAction {
  label: string;
  onClick: () => void;
}

export interface NotifyOptions {
  description?: ReactNode;
  action?: NotifyAction;
  duration?: number; // ms; default 10000
  id?: string | number;
}

interface NotifyItem extends NotifyOptions {
  id: string;
  variant: NotifyVariant;
  title: ReactNode;
  createdAt: number;
}

type Listener = (items: NotifyItem[]) => void;

class NotifyStore {
  private items: NotifyItem[] = [];
  private listeners = new Set<Listener>();

  subscribe(l: Listener) {
    this.listeners.add(l);
    l(this.items);
    return () => this.listeners.delete(l);
  }
  private emit() {
    for (const l of this.listeners) l(this.items);
  }
  add(variant: NotifyVariant, title: ReactNode, opts: NotifyOptions = {}) {
    const id = String(opts.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    const item: NotifyItem = {
      ...opts,
      id,
      variant,
      title,
      duration: opts.duration ?? 10000,
      createdAt: Date.now(),
    };
    // de-dupe by id
    this.items = [item, ...this.items.filter((i) => i.id !== id)].slice(0, 6);
    this.emit();
    return id;
  }
  dismiss(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
    this.emit();
  }
}

const store = new NotifyStore();

function call(variant: NotifyVariant, title: ReactNode, opts?: NotifyOptions) {
  return store.add(variant, title, opts);
}

export const toast = Object.assign(
  (title: ReactNode, opts?: NotifyOptions) => call("info", title, opts),
  {
    success: (title: ReactNode, opts?: NotifyOptions) => call("success", title, opts),
    error: (title: ReactNode, opts?: NotifyOptions) => call("error", title, opts),
    warning: (title: ReactNode, opts?: NotifyOptions) => call("warning", title, opts),
    info: (title: ReactNode, opts?: NotifyOptions) => call("info", title, opts),
    message: (title: ReactNode, opts?: NotifyOptions) => call("info", title, opts),
    dismiss: (id: string) => store.dismiss(id),
  },
);

export const notify = toast;

const VARIANT_STYLES: Record<NotifyVariant, { icon: typeof CheckCircle2; iconClass: string; bar: string }> = {
  success: { icon: CheckCircle2, iconClass: "text-emerald-600", bar: "bg-emerald-500" },
  error: { icon: AlertCircle, iconClass: "text-destructive", bar: "bg-destructive" },
  warning: { icon: AlertTriangle, iconClass: "text-amber-600", bar: "bg-amber-500" },
  info: { icon: Info, iconClass: "text-sky-600", bar: "bg-sky-500" },
};

function NotifyCard({ item, onDismiss }: { item: NotifyItem; onDismiss: (id: string) => void }) {
  const { t } = useTranslation();
  const { icon: Icon, iconClass, bar } = VARIANT_STYLES[item.variant];
  const hasMore = Boolean(item.description) || Boolean(item.action);
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const duration = item.duration ?? 10000;
  const startRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const [remainingMs, setRemainingMs] = useState(duration);

  // tick
  useEffect(() => {
    if (paused || leaving) return;
    startRef.current = Date.now();
    const tick = () => {
      const elapsed = elapsedBeforePauseRef.current + (Date.now() - startRef.current);
      const remaining = Math.max(0, duration - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        handleClose();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      elapsedBeforePauseRef.current += Date.now() - startRef.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, leaving, duration]);

  const handleClose = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => onDismiss(item.id), 200);
  }, [item.id, leaving, onDismiss]);

  const progress = Math.max(0, Math.min(1, remainingMs / duration));
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg",
        leaving ? "animate-fade-out" : "animate-scale-in",
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-start gap-3 p-3 pb-2">
        <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground break-words">{item.title}</div>
          {expanded && hasMore && (
            <div className="mt-1.5 space-y-2">
              {item.description && (
                <div className="text-sm text-muted-foreground break-words">{item.description}</div>
              )}
              {item.action && (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    handleClose();
                  }}
                  className="inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  {item.action.label}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 -mr-1 -mt-1">
          {hasMore && (
            <button
              type="button"
              aria-label={expanded ? t("notify.collapse") : t("notify.expand")}
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          )}
          <button
            type="button"
            aria-label={t("notify.close")}
            onClick={handleClose}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="block w-full text-left text-[11px] text-muted-foreground hover:text-foreground"
        >
          {paused
            ? t("notify.paused")
            : t("notify.countdown", { seconds })}{" "}
          <span className="font-semibold underline">
            {paused ? t("notify.resume") : t("notify.stop")}
          </span>
        </button>
      </div>
      <div className="h-1 w-full bg-muted">
        <div
          className={cn("h-full transition-[width] duration-100 ease-linear", bar)}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

const NotifyCtx = createContext<null | typeof store>(null);

export function NotifyContainer() {
  const [items, setItems] = useState<NotifyItem[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const unsub = store.subscribe(setItems);
    return () => {
      unsub();
    };
  }, []);
  const handleDismiss = useCallback((id: string) => store.dismiss(id), []);
  const ctx = useMemo(() => store, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <NotifyCtx.Provider value={ctx}>
      <div
        className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-3"
        aria-live="polite"
      >
        {items.map((item) => (
          <NotifyCard key={item.id} item={item} onDismiss={handleDismiss} />
        ))}
      </div>
    </NotifyCtx.Provider>,
    document.body,
  );
}

export function useNotifyStore() {
  return store;
}
