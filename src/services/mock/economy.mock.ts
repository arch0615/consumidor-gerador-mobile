import { economyOverview } from "@/mock/economy";
import type { EconomyOverview } from "@/types/domain";
import type { EconomyService } from "../economy.service";
import { mockQuery } from "./mock-request";

const EMPTY: EconomyOverview = {
  totalSavings: 0,
  currentMonthSavings: 0,
  averagePercent: 0,
  compensatedKwhTotal: 0,
  startedAt: "",
  months: [],
  indicators: { averageConsumptionKwh: 0, consumptionTrendPercent: null, savings12Months: 0, reductionPercent12Months: 0 }
};

export const mockEconomyService: EconomyService = {
  getOverview: () => mockQuery(() => economyOverview, () => EMPTY)
};
