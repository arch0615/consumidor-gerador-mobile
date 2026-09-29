import { useState } from "react";

interface Refetchable {
  refetch: () => Promise<unknown>;
}

/**
 * Pull-to-refresh state that only reflects user-initiated refreshes
 * (background refetches must not flash the spinner).
 */
export function useRefreshControl(...queries: Refetchable[]) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    void Promise.allSettled(queries.map((query) => query.refetch())).finally(() => setRefreshing(false));
  };
  return { refreshing, onRefresh };
}
