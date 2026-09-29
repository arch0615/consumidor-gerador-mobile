import type { EconomyMonth, EconomyOverview } from "@/types/domain";
import type { EconomyService } from "../economy.service";
import { fetchSnapshot, normaliseCompetencia, type SnapshotMonth } from "./business";

const HISTORY_MONTHS = 12;
const TREND_WINDOW = 3;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * One month for the charts. "Sem ACVEL" comes from the billing engine when the
 * month has an ACVEL invoice; legacy (Digital Grid) months fall back to
 * distribuidora + ACVEL + economia, the same approximation as the web portal.
 */
function toMonth(month: SnapshotMonth): EconomyMonth {
  const totalWithoutAcvel = month.total_sem_acvel ?? month.valor_distribuidora + month.valor_total + month.economia_reais;
  return {
    competencia: normaliseCompetencia(month.competencia),
    savings: round2(month.economia_reais),
    utilityCost: round2(month.valor_distribuidora),
    acvelCost: round2(month.valor_total),
    totalWithoutAcvel: round2(totalWithoutAcvel),
    compensatedKwh: round2(month.energia_compensada_kwh || month.energia_injetada_kwh),
    consumptionKwh: round2(month.consumo_kwh)
  };
}

export const remoteEconomyService: EconomyService = {
  async getOverview(): Promise<EconomyOverview> {
    const snapshot = await fetchSnapshot();
    const months = snapshot.summary.por_competencia
      .map(toMonth)
      .sort((a, b) => a.competencia.localeCompare(b.competencia))
      .slice(-HISTORY_MONTHS);

    const last = months.at(-1);
    const previous = months.slice(-(TREND_WINDOW + 1), -1);
    const previousAverage = previous.length > 0 ? sum(previous.map((month) => month.consumptionKwh)) / previous.length : 0;
    const savingsInWindow = sum(months.map((month) => month.savings));
    const withoutInWindow = sum(months.map((month) => month.totalWithoutAcvel));
    const percentMonths = months.filter((month) => month.savings > 0 && month.totalWithoutAcvel > 0);
    const compensatedTotal = snapshot.summary.total_energia_compensada_kwh ?? snapshot.summary.total_energia_injetada_kwh ?? sum(months.map((month) => month.compensatedKwh));

    return {
      totalSavings: round2(snapshot.summary.total_economia_reais),
      currentMonthSavings: last?.savings ?? 0,
      averagePercent: percentMonths.length > 0 ? round2((sum(percentMonths.map((month) => month.savings / month.totalWithoutAcvel)) / percentMonths.length) * 100) : 0,
      compensatedKwhTotal: round2(compensatedTotal),
      startedAt: months[0]?.competencia ?? "",
      months,
      indicators: {
        averageConsumptionKwh: months.length > 0 ? Math.round(sum(months.map((month) => month.consumptionKwh)) / months.length) : 0,
        consumptionTrendPercent: last && previousAverage > 0 ? round2(((last.consumptionKwh - previousAverage) / previousAverage) * 100) : null,
        savings12Months: round2(savingsInWindow),
        reductionPercent12Months: withoutInWindow > 0 ? round2((savingsInWindow / withoutInWindow) * 100) : 0
      }
    };
  }
};
