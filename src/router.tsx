import {
  MutationCache,
  QueryCache,
  QueryClient,
  type Mutation,
  type Query,
} from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import i18n from "@/lib/i18n";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** When true, MutationCache.onError skips the global error toast. */
      suppressGlobalError?: boolean;
    };
    queryMeta: {
      /** When true, QueryCache.onError shows a translated load-failed toast. */
      errorToast?: boolean;
    };
  }
}


/** Small helpers so we can import `toast` lazily (client-only) and never
 *  drag the notify module into the SSR render path. */
function isBrowser() {
  return typeof window !== "undefined";
}

async function notifyError(titleKey: string) {
  if (!isBrowser()) return;
  try {
    const { toast } = await import("@/lib/notify");
    toast.error(i18n.t(titleKey));
  } catch {
    // never let a broken notify break the app
  }
}

export const getRouter = () => {
  const mutationCache = new MutationCache({
    onError: (_error, _vars, _ctx, mutation: Mutation<unknown, unknown, unknown, unknown>) => {
      if (mutation.options.meta?.suppressGlobalError) return;
      void notifyError("common.saveFailed");
    },
  });

  const queryCache = new QueryCache({
    onError: (error, query: Query<unknown, unknown, unknown>) => {
      // Log-only by default so background refetch failures don't spam users.
      // Query keys include primitives we're safe to log for debuggability.
      // eslint-disable-next-line no-console
      console.error("[query error]", query.queryKey, error);
      if (query.meta?.errorToast) {
        void notifyError("common.loadFailed");
      }
    },
  });

  const queryClient = new QueryClient({
    mutationCache,
    queryCache,
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
