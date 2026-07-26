import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { whoAmIAdmin } from "@/lib/data/admin.functions";
import { useSession } from "@/lib/auth/use-profile";

/**
 * Cheap platform-admin gate probe. Result drives whether admin UI renders.
 * The server-side gate is still authoritative: every admin fn re-checks
 * assertCallerIsPlatformAdmin before any escalation.
 */
export function useIsAdmin() {
  const { user } = useSession();
  const probe = useServerFn(whoAmIAdmin);
  return useQuery({
    queryKey: ["is-platform-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const r = await probe();
      return r.isAdmin;
    },
    staleTime: 5 * 60_000,
  });
}
