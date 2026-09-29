import { config } from "@/config/env";
import type { EconomyOverview } from "@/types/domain";
import { mockEconomyService } from "./mock/economy.mock";
import { remoteEconomyService } from "./remote/economy.remote";

/**
 * Savings & consumption history.
 * API (business): GET /v1/consumidores/me/rateio-snapshot → `summary.por_competencia`
 * (per month: economia_reais, valor_total, valor_distribuidora, consumo/compensada kWh,
 * total_sem_acvel/total_com_acvel from the billing engine).
 */
export interface EconomyService {
  getOverview(): Promise<EconomyOverview>;
}

export const economyService: EconomyService = config.useMocks ? mockEconomyService : remoteEconomyService;
