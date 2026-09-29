import { config } from "@/config/env";
import type { DashboardSummary } from "@/types/domain";
import { mockDashboardService } from "./mock/dashboard.mock";
import { remoteDashboardService } from "./remote/dashboard.remote";

/**
 * Home aggregate, composed client-side (the API has no single dashboard endpoint for consumers):
 * GET /v1/auth/me, GET /v1/consumidores/me/rateio-snapshot, GET /v1/consumidores/me/ucs,
 * GET /v1/notificacoes/nao-lidas/count, GET /v1/documentos (rejected-document alerts).
 */
export interface DashboardService {
  getSummary(): Promise<DashboardSummary>;
}

export const dashboardService: DashboardService = config.useMocks ? mockDashboardService : remoteDashboardService;
