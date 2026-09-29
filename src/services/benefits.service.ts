import { config } from "@/config/env";
import type { BenefitsOverview } from "@/types/domain";
import { mockBenefitsService } from "./mock/benefits.mock";
import { remoteBenefitsService } from "./remote/benefits.remote";

/**
 * Points, rewards and referral.
 * API (business): GET /v1/pedidos/me/context (wallet), GET /v1/pontos/me (statement),
 * GET /v1/consumidores/me/indicacao (referral), GET /v1/produtos (rewards catalogue),
 * POST /v1/pedidos (redeem, Idempotency-Key).
 */
export interface BenefitsService {
  getOverview(): Promise<BenefitsOverview>;
  redeem(rewardId: string): Promise<BenefitsOverview>;
}

export const benefitsService: BenefitsService = config.useMocks ? mockBenefitsService : remoteBenefitsService;
