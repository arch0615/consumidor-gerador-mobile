import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { queryKeys } from "@/services/query-keys";

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: () => dashboardService.getSummary() });
}
