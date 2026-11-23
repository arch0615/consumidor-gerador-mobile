import { config } from "@/config/env";
import type { BenefitsOverview, PointsStatementPage, Redemption, ReferralProgram, RewardDetail } from "@/types/domain";
import { mockBenefitsService } from "./mock/benefits.mock";
import { remoteBenefitsService } from "./remote/benefits.remote";

/**
 * Points, marketplace and referral — the consumer features of the portal's /pontos, /marketplace
 * and /indicacao. Marketplace approval, stock and points crediting are ADM operations (not here).
 * API (business): GET /v1/pedidos/me/context (wallet), GET /v1/pontos/me (statement, paginated),
 * GET /v1/produtos + /v1/produtos/{id} (catalogue), POST /v1/pedidos (redeem, Idempotency-Key),
 * GET /v1/pedidos (my redemptions), POST /v1/pedidos/{id}/cancel (cancel a pending redemption),
 * GET /v1/consumidores/me/indicacao + /v1/consumidores/me/indicados (referral program).
 */
export interface BenefitsService {
  getOverview(): Promise<BenefitsOverview>;
  /** Requests a reward: reserves points + stock; debited after ACVEL approval. */
  redeem(rewardId: string): Promise<BenefitsOverview>;
  getReward(rewardId: string): Promise<{ reward: RewardDetail; pointsBalance: number }>;
  getRedemptions(): Promise<Redemption[]>;
  /** Only redemptions awaiting approval (PENDENTE) can be cancelled, as in the portal. */
  cancelRedemption(redemption: Pick<Redemption, "id" | "version">): Promise<Redemption[]>;
  getPointsStatement(page: number): Promise<PointsStatementPage>;
  getReferralProgram(): Promise<ReferralProgram>;
}

export const benefitsService: BenefitsService = config.useMocks ? mockBenefitsService : remoteBenefitsService;
