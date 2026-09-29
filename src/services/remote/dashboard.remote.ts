import type { AccountStatus, DashboardAlert, DashboardSummary, InvoiceSummary, Residence } from "@/types/domain";
import { daysUntil } from "@/utils/format";
import { DOCUMENT_KIND_LABEL, isResidenceRejected } from "@/utils/status-labels";
import type { DashboardService } from "../dashboard.service";
import { fetchConsumer, fetchSnapshot, normaliseCompetencia, snapshotInvoiceStatus, type Snapshot } from "./business";
import { fetchMe } from "./me";
import { listConsumerDocuments } from "./documents";
import { fetchUnreadCount } from "./notification.remote";
import { loadResidences } from "./residence.remote";

const DUE_SOON_DAYS = 5;

function valueOf<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function isActive(residence: Residence): boolean {
  return residence.status === "ATIVA_COMPENSANDO" || residence.status === "ATIVA_NAO_COMPENSANDO";
}

function accountStatusOf(residences: readonly Residence[]): AccountStatus {
  if (residences.some(isActive)) return "ATIVO";
  return residences.length > 0 ? "EM_ANALISE" : "PENDENTE";
}

/** Open ACVEL charges, overdue first, then by due date ("sem cobrança ACVEL" never counts). */
function nextInvoiceOf(snapshot: Snapshot): InvoiceSummary | null {
  const ucs = new Map(snapshot.ucs.map((uc) => [uc.id, uc] as const));
  const open = snapshot.invoices
    .map((invoice) => ({ invoice, status: snapshotInvoiceStatus(invoice) }))
    .filter(({ status }) => status === "PENDENTE" || status === "ATRASADO")
    .sort((a, b) => (a.status === b.status ? (a.invoice.vencimento ?? "").localeCompare(b.invoice.vencimento ?? "") : a.status === "ATRASADO" ? -1 : 1));
  const first = open[0];
  if (!first) return null;
  const uc = first.invoice.uc_id ? ucs.get(first.invoice.uc_id) : undefined;
  return {
    id: first.invoice.id,
    competencia: normaliseCompetencia(first.invoice.competencia),
    amount: first.invoice.valor_total,
    dueDate: (first.invoice.vencimento ?? "").slice(0, 10),
    status: first.status,
    ucNumber: first.invoice.numero_uc ?? uc?.numero ?? "",
    utility: uc?.concessionaria ?? ""
  };
}

export const remoteDashboardService: DashboardService = {
  async getSummary() {
    const snapshotRequest = fetchSnapshot();
    const [meResult, snapshotResult, residencesResult, unreadResult, documentsResult] = await Promise.allSettled([
      fetchMe(),
      snapshotRequest,
      loadResidences(snapshotRequest),
      fetchUnreadCount(),
      fetchConsumer().then((consumer) => (consumer ? listConsumerDocuments(consumer.id) : []))
    ]);
    // Without billing data *and* registrations there is nothing meaningful to show: surface the error.
    if (snapshotResult.status === "rejected" && residencesResult.status === "rejected") throw snapshotResult.reason;

    const identity = valueOf(meResult, null)?.identity ?? null;
    const snapshot = valueOf(snapshotResult, null);
    const residences = valueOf(residencesResult, []);
    const months = snapshot?.summary.por_competencia.slice(-12) ?? [];
    const lastMonth = months.at(-1);
    const nextInvoice = snapshot ? nextInvoiceOf(snapshot) : null;
    const primary = residences.find(isActive) ?? residences[0] ?? null;

    const savingsTotal = months.reduce((sum, month) => sum + month.economia_reais, 0);
    const withoutAcvel = months.reduce((sum, month) => sum + (month.total_sem_acvel ?? month.valor_distribuidora + month.valor_total + month.economia_reais), 0);

    const alerts: DashboardAlert[] = [];
    if (nextInvoice?.status === "ATRASADO") {
      alerts.push({ id: `overdue-${nextInvoice.id}`, tone: "danger", title: "Fatura em atraso", message: "Regularize o pagamento para evitar juros e manter seus créditos ativos.", action: { type: "INVOICE_PAYMENT", resourceId: nextInvoice.id }, actionLabel: "Pagar agora" });
    } else if (nextInvoice && nextInvoice.dueDate && daysUntil(nextInvoice.dueDate) <= DUE_SOON_DAYS) {
      const days = daysUntil(nextInvoice.dueDate);
      alerts.push({ id: `due-${nextInvoice.id}`, tone: "warning", title: days === 0 ? "Sua fatura vence hoje" : `Sua fatura vence em ${days} dia${days === 1 ? "" : "s"}`, message: "Pague com Pix e veja a confirmação na hora.", action: { type: "INVOICE_DETAILS", resourceId: nextInvoice.id }, actionLabel: "Ver fatura" });
    }
    // Only the newest document of each kind matters (a resend supersedes a rejection).
    const documents = valueOf(documentsResult, []);
    const latestByKind = new Map<string, (typeof documents)[number]>();
    for (const document of documents) if (!latestByKind.has(document.kind)) latestByKind.set(document.kind, document);
    for (const document of latestByKind.values()) {
      if (document.status !== "REPROVADO") continue;
      alerts.push({ id: `doc-${document.id}`, tone: "danger", title: `Documento reprovado: ${DOCUMENT_KIND_LABEL[document.kind]}`, message: document.rejectionReason ?? "Envie o documento novamente.", action: { type: "DOCUMENTS" }, actionLabel: "Reenviar" });
    }
    for (const residence of residences) {
      if (residence.status === "AGUARDANDO_ASSINATURA") {
        alerts.push({ id: `sign-${residence.id}`, tone: "warning", title: "Contrato aguardando assinatura", message: `Assine o contrato da UC ${residence.ucNumber} para começar a economizar.`, action: { type: "RESIDENCE_DETAILS", resourceId: residence.id }, actionLabel: "Ver unidade" });
      } else if (isResidenceRejected(residence.status)) {
        alerts.push({ id: `rejected-${residence.id}`, tone: "danger", title: "Cadastro de unidade precisa de ajustes", message: residence.rejectionReason ?? `Revise os dados da UC ${residence.ucNumber}.`, action: { type: "RESIDENCE_DETAILS", resourceId: residence.id }, actionLabel: "Corrigir" });
      }
    }
    if (identity && !identity.onboardingCompleted && identity.onboardingStatus !== "EM_ANALISE") {
      alerts.push({ id: "onboarding", tone: "info", title: "Finalize seu cadastro", message: "Envie seus documentos e aceite os termos no portal ACVEL para ativar sua conta.", action: null, actionLabel: null });
    }

    const summary: DashboardSummary = {
      greetingName: identity?.firstName ?? "",
      accountStatus: accountStatusOf(residences),
      primaryUnit: primary ? { id: primary.id, ucNumber: primary.ucNumber, utility: primary.utility, city: primary.address.city, uf: primary.address.uf } : null,
      unitsCount: residences.length,
      nextInvoice,
      energy: {
        compensatedKwhMonth: lastMonth?.energia_compensada_kwh ?? 0,
        consumptionKwhMonth: lastMonth?.consumo_kwh ?? 0,
        creditBalanceKwh: null,
        competencia: lastMonth ? normaliseCompetencia(lastMonth.competencia) : ""
      },
      savings: {
        totalSavings: snapshot?.summary.total_economia_reais ?? 0,
        monthlySavings: lastMonth?.economia_reais ?? 0,
        averagePercent: withoutAcvel > 0 ? Math.round((savingsTotal / withoutAcvel) * 1000) / 10 : 0,
        series: months.slice(-6).map((month) => ({ competencia: normaliseCompetencia(month.competencia), value: month.economia_reais }))
      },
      alerts,
      unreadNotifications: valueOf(unreadResult, 0)
    };
    return summary;
  }
};
