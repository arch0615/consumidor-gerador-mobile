import { benefits } from "@/mock/benefits";
import type { BenefitsOverview } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import type { BenefitsService } from "../benefits.service";
import { mockId, mockMutation, mockQuery } from "./mock-request";

const state: BenefitsOverview = { ...benefits, recentEntries: [...benefits.recentEntries] };

export const mockBenefitsService: BenefitsService = {
  getOverview: () => mockQuery(() => state),

  redeem: (rewardId) =>
    mockMutation(() => {
      const reward = state.rewards.find((candidate) => candidate.id === rewardId);
      if (!reward || !reward.available) throw new AppError("RESOURCE_NOT_FOUND", "Recompensa indisponível.");
      if (state.pointsBalance < reward.pointsPrice) throw new AppError("BUSINESS_RULE_VIOLATION", "Pontos insuficientes para esta troca.");
      state.pointsBalance -= reward.pointsPrice;
      state.recentEntries = [
        { id: mockId("pts"), description: `Troca: ${reward.name}`, points: -reward.pointsPrice, occurredAt: new Date().toISOString(), status: "CONFIRMADO" },
        ...state.recentEntries
      ];
      return state;
    })
};
