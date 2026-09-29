import type { Competencia } from "@/types/domain";
import { addMonths, LAST_BILLED } from "./calendar";

/**
 * Monthly energy + cost history for the demo unit, shared by the invoice,
 * economy and dashboard mocks so every screen shows consistent numbers.
 */
export interface EnergyMonth {
  competencia: Competencia;
  consumptionKwh: number;
  compensatedKwh: number;
  totalWithoutAcvel: number;
  utilityCost: number;
  acvelCost: number;
  savings: number;
}

const TARIFF_PER_KWH = 0.94;
const AVAILABILITY_KWH = 30; // taxa mínima (bifásico)
const PUBLIC_LIGHTING_FEE = 18.4;
const ACVEL_DISCOUNT = 0.18;

/** Oldest → newest; first month still onboarding (no compensation). */
const CONSUMPTION_KWH = [312, 298, 341, 356, 330, 301, 284, 266, 259, 272, 295] as const;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export const ENERGY_HISTORY: readonly EnergyMonth[] = CONSUMPTION_KWH.map((consumptionKwh, index) => {
  const competencia = addMonths(LAST_BILLED, index - (CONSUMPTION_KWH.length - 1));
  const compensatedKwh = index === 0 ? 0 : Math.round((consumptionKwh - AVAILABILITY_KWH) * (0.93 + (index % 3) * 0.02));
  const totalWithoutAcvel = round2(consumptionKwh * TARIFF_PER_KWH + PUBLIC_LIGHTING_FEE);
  const utilityCost = round2((consumptionKwh - compensatedKwh) * TARIFF_PER_KWH + PUBLIC_LIGHTING_FEE);
  const acvelCost = round2(compensatedKwh * TARIFF_PER_KWH * (1 - ACVEL_DISCOUNT));
  return {
    competencia,
    consumptionKwh,
    compensatedKwh,
    totalWithoutAcvel,
    utilityCost,
    acvelCost,
    savings: round2(totalWithoutAcvel - utilityCost - acvelCost)
  };
});
