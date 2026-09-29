import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { benefitsService } from "@/services/benefits.service";
import { queryKeys } from "@/services/query-keys";

export function useBenefits() {
  return useQuery({ queryKey: queryKeys.benefits, queryFn: () => benefitsService.getOverview() });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string) => benefitsService.redeem(rewardId),
    onSuccess: (overview) => queryClient.setQueryData(queryKeys.benefits, overview)
  });
}
