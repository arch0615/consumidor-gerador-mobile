import type { DashboardAlert, DashboardSummary, InvoiceDetail, InvoiceSummary } from "@/types/domain";
import { demoProfile } from "./consumer";
import { economyOverview } from "./economy";
import { ENERGY_HISTORY } from "./energy-history";
import { invoices } from "./invoice";
import { notifications } from "./notification";
import { PRIMARY_RESIDENCE_ID, residences } from "./residence";

const CREDIT_BALANCE_KWH = 142;

function toSummary(invoice: InvoiceDetail): InvoiceSummary {
  const { id, competencia, amount, dueDate, status, ucNumber, utility } = invoice;
  return { id, competencia, amount, dueDate, status, ucNumber, utility };
}

/**
 * Composes the Home payload from the other mocks at request time, so paying
 * an invoice or reading a notification is reflected on the next refresh.
 * The real backend returns this from GET /api/v1/me/dashboard.
 */
export function buildDashboard(): DashboardSummary {
  const open = invoices.filter((invoice) => invoice.status === "PENDENTE" || invoice.status === "ATRASADO");
  const overdue = open.filter((invoice) => invoice.status === "ATRASADO");
  const nextInvoice = overdue[0] ?? open.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;
  const primary = residences.find((residence) => residence.id === PRIMARY_RESIDENCE_ID);
  const awaitingSignature = residences.find((residence) => residence.status === "AGUARDANDO_ASSINATURA");
  const lastMonth = ENERGY_HISTORY[ENERGY_HISTORY.length - 1];

  const alerts: DashboardAlert[] = [];
  const firstOverdue = overdue[0];
  if (firstOverdue) {
    alerts.push({
      id: `alert_overdue_${firstOverdue.id}`,
      tone: "danger",
      title: "Fatura vencida",
      message: "Pague agora com Pix para evitar juros e manter seus créditos ativos.",
      action: { type: "INVOICE_PAYMENT", resourceId: firstOverdue.id },
      actionLabel: "Pagar agora"
    });
  }
  if (awaitingSignature) {
    alerts.push({
      id: `alert_contract_${awaitingSignature.id}`,
      tone: "warning",
      title: "Contrato aguardando assinatura",
      message: "Assine o contrato da nova unidade para começar a economizar nela também.",
      action: { type: "RESIDENCE_DETAILS", resourceId: awaitingSignature.id },
      actionLabel: "Ver unidade"
    });
  }

  return {
    greetingName: demoProfile.firstName,
    accountStatus: "ATIVO",
    primaryUnit: primary ? { id: primary.id, ucNumber: primary.ucNumber, utility: primary.utility, city: primary.address.city, uf: primary.address.uf } : null,
    unitsCount: residences.length,
    nextInvoice: nextInvoice ? toSummary(nextInvoice) : null,
    energy: {
      compensatedKwhMonth: lastMonth?.compensatedKwh ?? 0,
      consumptionKwhMonth: lastMonth?.consumptionKwh ?? 0,
      creditBalanceKwh: CREDIT_BALANCE_KWH,
      competencia: lastMonth?.competencia ?? ""
    },
    savings: {
      totalSavings: economyOverview.totalSavings,
      monthlySavings: economyOverview.currentMonthSavings,
      averagePercent: economyOverview.averagePercent,
      series: ENERGY_HISTORY.slice(-6).map((month) => ({ competencia: month.competencia, value: month.savings }))
    },
    alerts,
    unreadNotifications: notifications.filter((notification) => !notification.read).length
  };
}

/** Brand-new account (no units yet) — used by the "empty" dev scenario. */
export function buildEmptyDashboard(): DashboardSummary {
  return {
    greetingName: demoProfile.firstName,
    accountStatus: "PENDENTE",
    primaryUnit: null,
    unitsCount: 0,
    nextInvoice: null,
    energy: { compensatedKwhMonth: 0, consumptionKwhMonth: 0, creditBalanceKwh: 0, competencia: "" },
    savings: { totalSavings: 0, monthlySavings: 0, averagePercent: 0, series: [] },
    alerts: [],
    unreadNotifications: 0
  };
}
