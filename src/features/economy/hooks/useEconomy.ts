import { useQuery } from "@tanstack/react-query";
import { economyService } from "@/services/economy.service";
import { queryKeys } from "@/services/query-keys";

export function useEconomy() {
  return useQuery({ queryKey: queryKeys.economy, queryFn: () => economyService.getOverview(), staleTime: 10 * 60_000 });
}
