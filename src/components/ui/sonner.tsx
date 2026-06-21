// Backwards-compat shim: the app's custom NotifyContainer replaces sonner.
// Existing imports of `Toaster` from "@/components/ui/sonner" keep working.
import { NotifyContainer } from "@/lib/notify";

const Toaster = (_props: Record<string, unknown>) => <NotifyContainer />;

export { Toaster };
