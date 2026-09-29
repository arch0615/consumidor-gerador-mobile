import type { Competencia, ISODate, ISODateTime } from "@/types/domain";

/**
 * Mock data is anchored to the current date so due dates, "há 2 horas" and
 * overdue states stay realistic whenever the app is opened.
 */
const NOW = new Date();

export function competenciaOf(date: Date): Competencia {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(competencia: Competencia, months: number): Competencia {
  const [year = 0, month = 1] = competencia.split("-").map(Number);
  return competenciaOf(new Date(year, month - 1 + months, 1));
}

/** Day `day` of the month after the competência (invoice due dates). */
export function dueDateFor(competencia: Competencia, day = 10): ISODate {
  return `${addMonths(competencia, 1)}-${String(day).padStart(2, "0")}`;
}

export const CURRENT_COMPETENCIA = competenciaOf(NOW);
/** Latest billed month (the current month is still being measured). */
export const LAST_BILLED = addMonths(CURRENT_COMPETENCIA, -1);
export const TODAY: ISODate = NOW.toISOString().slice(0, 10);

export function daysAgo(days: number, hour = 10): ISODateTime {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function hoursAgo(hours: number): ISODateTime {
  return new Date(NOW.getTime() - hours * 3_600_000).toISOString();
}
