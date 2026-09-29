import type { EconomyOverview } from "@/types/domain";
import { ENERGY_HISTORY } from "./energy-history";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const compensating = ENERGY_HISTORY.filter((month) => month.compensatedKwh > 0);
const last = ENERGY_HISTORY[ENERGY_HISTORY.length - 1];
const previous3 = ENERGY_HISTORY.slice(-4, -1);
const avgPrevious3 = sum(previous3.map((month) => month.consumptionKwh)) / Math.max(previous3.length, 1);
const totalSavings = round2(sum(ENERGY_HISTORY.map((month) => month.savings)));
const totalWithout = sum(ENERGY_HISTORY.map((month) => month.totalWithoutAcvel));

export const economyOverview: EconomyOverview = {
  totalSavings,
  currentMonthSavings: last?.savings ?? 0,
  averagePercent: round2((sum(compensating.map((month) => month.savings / month.totalWithoutAcvel)) / Math.max(compensating.length, 1)) * 100),
  compensatedKwhTotal: sum(ENERGY_HISTORY.map((month) => month.compensatedKwh)),
  startedAt: ENERGY_HISTORY[0]?.competencia ?? "",
  months: ENERGY_HISTORY.map((month) => ({ ...month })),
  indicators: {
    averageConsumptionKwh: Math.round(sum(ENERGY_HISTORY.map((month) => month.consumptionKwh)) / Math.max(ENERGY_HISTORY.length, 1)),
    consumptionTrendPercent: last && avgPrevious3 > 0 ? round2(((last.consumptionKwh - avgPrevious3) / avgPrevious3) * 100) : null,
    savings12Months: totalSavings,
    reductionPercent12Months: totalWithout > 0 ? round2((totalSavings / totalWithout) * 100) : 0
  }
};
