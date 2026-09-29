import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useIsOnline } from "@/hooks/useNetworkStatus";
import { AppError, errorMessage } from "@/utils/app-error";
import { EmptyState, ErrorState, LoadingState, OfflineState, type EmptyStateProps, type LoadingLayout } from "./States";

export interface QueryViewProps<T> {
  query: UseQueryResult<T>;
  loading?: LoadingLayout;
  loadingRows?: number;
  /** Return true when the loaded data should render the empty state. */
  isEmpty?: (data: T) => boolean;
  empty?: EmptyStateProps;
  errorTitle?: string;
  children: (data: T) => ReactNode;
}

/**
 * Standard data-screen state machine: skeleton on first load, offline state
 * without cache, error with retry, friendly empty state, then content. When
 * cached data exists it is always shown (refresh errors don't blank the page).
 */
export function QueryView<T>({ query, loading = "list", loadingRows, isEmpty, empty, errorTitle, children }: QueryViewProps<T>) {
  const online = useIsOnline();
  const retry = () => void query.refetch();

  if (query.data !== undefined) {
    if (isEmpty?.(query.data) && empty) return <EmptyState {...empty} />;
    return <>{children(query.data)}</>;
  }
  if (query.isPending && query.fetchStatus !== "paused") {
    return <LoadingState layout={loading} {...(loadingRows ? { rows: loadingRows } : {})} />;
  }
  if (!online || query.fetchStatus === "paused" || (query.error instanceof AppError && query.error.code === "NETWORK_UNAVAILABLE")) {
    return <OfflineState onRetry={retry} />;
  }
  return <ErrorState {...(errorTitle ? { title: errorTitle } : {})} message={errorMessage(query.error)} onRetry={retry} />;
}
