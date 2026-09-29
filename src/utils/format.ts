/**
 * pt-BR display formatters (docs/mobile-design-system.md §3.11).
 * Business dates are rendered in America/Sao_Paulo.
 */
import type { Competencia, ISODate, ISODateTime } from "@/types/domain";

const TIME_ZONE = "America/Sao_Paulo";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const integerFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;
const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
] as const;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** Compact currency for charts: "R$ 1,2 mil". */
export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000) return `R$ ${decimalFormatter.format(value / 1000)} mil`;
  return `R$ ${integerFormatter.format(value)}`;
}

export function formatKwh(value: number): string {
  return `${integerFormatter.format(value)} kWh`;
}

export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

export function formatPoints(value: number): string {
  return `${integerFormatter.format(value)} pts`;
}

export function formatSignedPoints(value: number): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${integerFormatter.format(Math.abs(value))} pts`;
}

/** Parses YYYY-MM-DD as a calendar date (no UTC shift). */
function parseDate(value: ISODate): { year: number; month: number; day: number } {
  const [year = "0", month = "1", day = "1"] = value.slice(0, 10).split("-");
  return { year: Number(year), month: Number(month), day: Number(day) };
}

export function formatDate(value: ISODate): string {
  const { year, month, day } = parseDate(value);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

export function formatDateTime(value: ISODateTime): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

/** "Set/2026" */
export function formatCompetencia(value: Competencia): string {
  const [year = "", month = "1"] = value.split("-");
  return `${MONTHS_SHORT[Number(month) - 1] ?? ""}/${year}`;
}

/** "setembro de 2026" (screen-reader friendly) */
export function formatCompetenciaLong(value: Competencia): string {
  const [year = "", month = "1"] = value.split("-");
  return `${MONTHS_LONG[Number(month) - 1] ?? ""} de ${year}`;
}

export function formatCompetenciaShort(value: Competencia): string {
  const [, month = "1"] = value.split("-");
  return MONTHS_SHORT[Number(month) - 1] ?? "";
}

/** Today's date in the business time zone (YYYY-MM-DD). */
export function businessToday(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Whole days from today until a due date (negative when overdue). */
export function daysUntil(date: ISODate, now: Date = new Date()): number {
  const target = parseDate(date);
  const today = parseDate(businessToday(now));
  const targetUtc = Date.UTC(target.year, target.month - 1, target.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

export function formatDueIn(date: ISODate, now: Date = new Date()): string {
  const days = daysUntil(date, now);
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  if (days > 1) return `Vence em ${days} dias`;
  if (days === -1) return "Venceu ontem";
  return `Venceu há ${Math.abs(days)} dias`;
}

export function formatRelativeTime(value: ISODateTime, now: Date = new Date()): string {
  const diffMinutes = Math.round((now.getTime() - new Date(value).getTime()) / 60_000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `há ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
  return formatDateTime(value).slice(0, 10);
}

export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatCpfCnpj(value: string): string {
  return onlyDigits(value).length > 11 ? formatCnpj(value) : formatCpf(value);
}

/** Masks a CPF for display in headers: ***.456.789-** */
export function maskCpf(value: string): string {
  const d = onlyDigits(value);
  if (d.length !== 11) return formatCpfCnpj(value);
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function formatPhone(value: string): string {
  let d = onlyDigits(value);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatAddress(address: { street: string; number: string; complement: string | null; district: string; city: string; uf: string }): string {
  const complement = address.complement ? `, ${address.complement}` : "";
  return `${address.street}, ${address.number}${complement} · ${address.district}, ${address.city}/${address.uf}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${decimalFormatter.format(bytes / (1024 * 1024))} MB`;
  return `${integerFormatter.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

/** Groups digits of a boleto digitable line for readability. */
export function formatDigitableLine(line: string): string {
  const d = onlyDigits(line);
  if (d.length !== 47) return d;
  return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
