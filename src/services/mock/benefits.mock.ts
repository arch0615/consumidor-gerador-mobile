import { benefits, demoRedemptions, demoReferred } from "@/mock/benefits";
import type { BenefitsOverview, Redemption } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import type { BenefitsService } from "../benefits.service";
import { mockId, mockMutation, mockQuery } from "./mock-request";

const STATEMENT_PAGE_SIZE = 3;

const state: BenefitsOverview = { ...benefits, recentEntries: [...benefits.recentEntries] };
const redemptions: Redemption[] = [...demoRedemptions];

function findReward(rewardId: string) {
  const reward = state.rewards.find((candidate) => candidate.id === rewardId);
  if (!reward) throw new AppError("RESOURCE_NOT_FOUND", "Recompensa indisponível.");
  return reward;
}

export const mockBenefitsService: BenefitsService = {
  getOverview: () => mockQuery(() => state),

  // Like the backend: the request reserves the points (pending) until ACVEL approves it.
  redeem: (rewardId) =>
    mockMutation(() => {
      const reward = findReward(rewardId);
      if (!reward.available) throw new AppError("RESOURCE_NOT_FOUND", "Recompensa indisponível.");
      if (state.pointsBalance < reward.pointsPrice) throw new AppError("BUSINESS_RULE_VIOLATION", "Pontos insuficientes para esta troca.");
      state.pointsBalance -= reward.pointsPrice;
      state.pointsPending += reward.pointsPrice;
      redemptions.unshift({ id: mockId("ped"), rewardId: reward.id, rewardName: reward.name, points: reward.pointsPrice, status: "PENDENTE", createdAt: new Date().toISOString(), version: 1 });
      return state;
    }),

  getReward: (rewardId) =>
    mockQuery(() => {
      const reward = findReward(rewardId);
      return { reward: { ...reward, longDescription: `${reward.description} Sujeito à disponibilidade e aprovação da ACVEL.` }, pointsBalance: state.pointsBalance };
    }),

  getRedemptions: () => mockQuery(() => redemptions, () => []),

  cancelRedemption: ({ id }) =>
    mockMutation(() => {
      const redemption = redemptions.find((candidate) => candidate.id === id);
      if (!redemption || redemption.status !== "PENDENTE") throw new AppError("BUSINESS_RULE_VIOLATION", "Este resgate não pode mais ser cancelado.");
      redemption.status = "CANCELADO";
      state.pointsBalance += redemption.points;
      state.pointsPending = Math.max(state.pointsPending - redemption.points, 0);
      return redemptions;
    }),

  getPointsStatement: (page) =>
    mockQuery(
      () => {
        const entries = [...state.recentEntries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
        const totalPages = Math.max(Math.ceil(entries.length / STATEMENT_PAGE_SIZE), 1);
        return { entries: entries.slice((page - 1) * STATEMENT_PAGE_SIZE, page * STATEMENT_PAGE_SIZE), page, totalPages, balance: state.pointsBalance };
      },
      () => ({ entries: [], page: 1, totalPages: 1, balance: 0 })
    ),

  getReferralProgram: () =>
    mockQuery(() => ({
      active: true,
      code: state.referral.code,
      link: state.referral.link,
      inviteMessage: "Estou economizando na conta de energia com a ACVEL. Use meu link para se cadastrar e ganhar benefícios.",
      rewardPoints: 250,
      monthlyLimit: state.referral.monthlyLimit,
      usedThisMonth: state.referral.usedThisMonth,
      invited: state.referral.invited,
      activeReferrals: state.referral.active,
      pointsEarned: state.referral.pointsEarned,
      referred: demoReferred
    }))
};
