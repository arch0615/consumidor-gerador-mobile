import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { benefitsService } from "@/services/benefits.service";
import { queryKeys } from "@/services/query-keys";
import type { Redemption } from "@/types/domain";

export function useBenefits() {
  return useQuery({ queryKey: queryKeys.benefits, queryFn: () => benefitsService.getOverview() });
}

/** Redemption changes the balance, the statement and "Meus resgates": refresh every benefits query. */
export function useRedeemReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string) => benefitsService.redeem(rewardId),
    onSuccess: (overview) => {
      queryClient.setQueryData(queryKeys.benefits, overview);
      void queryClient.invalidateQueries({ queryKey: queryKeys.benefits });
    }
  });
}

export function useReward(rewardId: string) {
  return useQuery({ queryKey: queryKeys.benefitsDetail.reward(rewardId), queryFn: () => benefitsService.getReward(rewardId), enabled: rewardId !== "" });
}

export function useRedemptions() {
  return useQuery({ queryKey: queryKeys.benefitsDetail.redemptions, queryFn: () => benefitsService.getRedemptions() });
}

export function useCancelRedemption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (redemption: Pick<Redemption, "id" | "version">) => benefitsService.cancelRedemption(redemption),
    onSuccess: (redemptions) => {
      queryClient.setQueryData(queryKeys.benefitsDetail.redemptions, redemptions);
      void queryClient.invalidateQueries({ queryKey: queryKeys.benefits });
    }
  });
}

/** Full points statement, page by page (GET /v1/pontos/me). */
export function usePointsStatement() {
  return useInfiniteQuery({
    queryKey: queryKeys.benefitsDetail.statement,
    queryFn: ({ pageParam }) => benefitsService.getPointsStatement(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined)
  });
}

export function useReferralProgram() {
  return useQuery({ queryKey: queryKeys.benefitsDetail.referral, queryFn: () => benefitsService.getReferralProgram() });
}
