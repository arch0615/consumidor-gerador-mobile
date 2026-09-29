import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { toAppError } from "@/utils/app-error";

const MAX_RETRIES = 2;

/**
 * No token at all (provider signed out behind our back) ends the session —
 * fail closed. 401s are already handled by the API client (refresh + retry once).
 */
function handleAuthFailure(error: unknown): void {
  if (toAppError(error).code === "AUTH_REQUIRED") {
    void useAuthStore.getState().endSession({ tone: "warning", title: "Sua sessão expirou", message: "Entre novamente para continuar." });
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthFailure }),
  mutationCache: new MutationCache({ onError: handleAuthFailure }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      // Only transient failures (network / 5xx / timeout) are retried.
      retry: (failureCount, error) => failureCount < MAX_RETRIES && toAppError(error).isTransient,
      refetchOnWindowFocus: false
    },
    mutations: { retry: false }
  }
});
