import { z } from "zod";
import type { BillingMode, BoletoCharge, ChargeStatus, InvoiceDetail, InvoiceFilters, InvoiceStatus, InvoiceSummary, PaymentMethod, PaymentRecord } from "@/types/domain";
import { isAppError } from "@/utils/app-error";
import { barcodeFromDigitableLine } from "@/utils/boleto";
import { onlyDigits } from "@/utils/format";
import { api } from "../api/apiClient";
import { downloadAuthenticatedFile } from "../api/file-transfer";
import { zId, zList, zNumber, zNumberOrNull, zStringOrNull } from "../api/schema";
import type { InvoiceService } from "../invoice.service";
import { fetchSnapshot, hasAcvelInvoicePdf, normaliseCompetencia, normaliseInvoiceStatus, snapshotInvoiceStatus, type Snapshot, type SnapshotInvoice } from "./business";

// ── Rateio invoice payloads (GET /v1/faturas/me, /v1/faturas/{id}) ────

const faturaUcSchema = z.object({ numero: zStringOrNull, titular: zStringOrNull, concessionaria: zStringOrNull }).nullish();

const faturaSchema = z.object({
  id: zId,
  competencia: zStringOrNull,
  valor_total: zNumber.default(0),
  vencimento: zStringOrNull,
  status: z.string().default(""),
  uc: faturaUcSchema,
  numero_uc: zStringOrNull,
  uc_id: zStringOrNull,
  concessionaria: zStringOrNull,
  distribuidora: zStringOrNull,
  modo_cobranca: zStringOrNull,
  origem_portal: zStringOrNull
});

const faturaDetailSchema = faturaSchema.extend({
  valor_distribuidora: zNumberOrNull,
  desconto_aplicado: zNumberOrNull,
  economia_reais: zNumberOrNull,
  consumo_kwh: zNumberOrNull,
  // Swagger FaturaResponseDto names it credito_compensado_kwh; energia_compensada_kwh kept for the legacy shape.
  credito_compensado_kwh: zNumberOrNull,
  energia_compensada_kwh: zNumberOrNull,
  paga_em: zStringOrNull,
  metodo_pagamento: zStringOrNull,
  pdf_status: zStringOrNull,
  pdf_path: zStringOrNull,
  itens_cobranca: z.array(z.object({ tipo: zStringOrNull, descricao: zStringOrNull, valor: zNumber.default(0) })).nullish(),
  fatura_distribuidora_referencia: z.object({ valorTotal: zNumberOrNull, vencimento: zStringOrNull }).nullish()
});

type Fatura = z.output<typeof faturaSchema>;
type FaturaDetail = z.output<typeof faturaDetailSchema>;

// ── Charge (GET /v1/pagamentos/cobrancas, Swagger CobrancaResponseDto) ─

const cobrancaSchema = z.object({
  id: zId,
  fatura_id: zStringOrNull,
  metodo: zStringOrNull,
  status: z.string().default("PENDENTE"),
  valor: zNumberOrNull,
  pix_qr_code: zStringOrNull,
  pix_copia_cola: zStringOrNull,
  pix_copia_e_cola: zStringOrNull,
  pix_emv: zStringOrNull,
  pix_expira_em: zStringOrNull,
  boleto_codigo: zStringOrNull,
  boleto_codigo_barras: zStringOrNull,
  boleto_linha_digitavel: zStringOrNull,
  boleto_url_pdf: zStringOrNull,
  boleto_pdf_url: zStringOrNull,
  confirmado_em: zStringOrNull,
  created_at: zStringOrNull
});

type Cobranca = z.output<typeof cobrancaSchema>;

function chargeStatusOf(raw: string): ChargeStatus {
  switch (raw.toUpperCase()) {
    case "CONFIRMADO":
    case "PAGO":
      return "CONFIRMADO";
    case "EXPIRADO":
      return "EXPIRADO";
    case "ESTORNADO":
    case "FALHOU":
    case "CANCELADO":
      return "FALHOU";
    case "PROCESSANDO":
      return "PROCESSANDO";
    default:
      return "AGUARDANDO";
  }
}

function pixPayloadOf(charge: Cobranca): string {
  return charge.pix_qr_code ?? charge.pix_copia_cola ?? charge.pix_copia_e_cola ?? charge.pix_emv ?? "";
}

/** Charges of an invoice. Rateio answers 404 when the invoice has no charge: that is "no charge", not a failure. */
async function listCharges(invoiceId: string): Promise<Cobranca[]> {
  try {
    return await api.get("rateio", "/v1/pagamentos/cobrancas", zList(cobrancaSchema), { query: { fatura_id: invoiceId, perPage: 50 } });
  } catch (error) {
    if (isAppError(error, "RESOURCE_NOT_FOUND")) return [];
    throw error;
  }
}

/**
 * An invoice may have several charges (per method, or re-issued after expiry).
 * Prefer a confirmed one, then the newest charge carrying the payload the screen needs.
 * Null when the invoice has no charge.
 */
async function fetchCharge(invoiceId: string, kind: "pix" | "boleto"): Promise<Cobranca | null> {
  const charges = await listCharges(invoiceId);
  const confirmed = charges.find((charge) => chargeStatusOf(charge.status) === "CONFIRMADO");
  if (confirmed) return confirmed;
  const newestFirst = [...charges].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const hasPayload = (charge: Cobranca) => (kind === "pix" ? pixPayloadOf(charge) !== "" : Boolean(charge.boleto_linha_digitavel));
  return newestFirst.find(hasPayload) ?? newestFirst[0] ?? null;
}

// ── Mapping ────────────────────────────────────────────────────────────

function isConsumerInvoice(fatura: Fatura): boolean {
  // Generator plant utility bills (ACVEL_USINA) belong to the generator portal.
  return (fatura.origem_portal ?? "ACVEL").toUpperCase() !== "ACVEL_USINA";
}

function billingModeOf(raw: string | null): BillingMode {
  return raw === "SEPARADA" ? "SEPARADA" : "UNIFICADA";
}

function toSummary(fatura: Fatura): InvoiceSummary {
  return {
    id: fatura.id,
    competencia: normaliseCompetencia(fatura.competencia),
    amount: fatura.valor_total,
    dueDate: (fatura.vencimento ?? "").slice(0, 10),
    status: normaliseInvoiceStatus(fatura.status, fatura.vencimento),
    ucNumber: fatura.uc?.numero ?? fatura.numero_uc ?? "",
    utility: fatura.concessionaria ?? fatura.distribuidora ?? fatura.uc?.concessionaria ?? ""
  };
}

function snapshotToSummary(invoice: SnapshotInvoice, snapshot: Snapshot): InvoiceSummary {
  const uc = snapshot.ucs.find((candidate) => candidate.id === invoice.uc_id);
  return {
    id: invoice.id,
    competencia: normaliseCompetencia(invoice.competencia),
    amount: invoice.valor_total,
    dueDate: (invoice.vencimento ?? "").slice(0, 10),
    status: snapshotInvoiceStatus(invoice),
    ucNumber: invoice.numero_uc ?? uc?.numero ?? "",
    utility: uc?.concessionaria ?? ""
  };
}

function paymentMethodOf(raw: string | null): PaymentMethod | null {
  const value = (raw ?? "").toUpperCase();
  if (value.includes("PIX")) return "PIX";
  if (value.includes("BOLETO")) return "BOLETO";
  return null;
}

function matchesFilter(status: InvoiceStatus, filter: InvoiceFilters["status"]): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "OPEN":
      return status === "PENDENTE" || status === "ATRASADO";
    case "PAID":
      return status === "PAGO";
    case "OVERDUE":
      return status === "ATRASADO";
  }
}

function firstCompetencia(periodMonths: number): string {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - periodMonths + 1, 1);
  return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
}

/** The period filter applies to history; an open or overdue invoice is always listed, whatever its competência. */
function inPeriod(invoice: InvoiceSummary, oldest: string): boolean {
  return !invoice.competencia || invoice.competencia >= oldest || invoice.status === "PENDENTE" || invoice.status === "ATRASADO";
}

function sortNewestFirst(list: InvoiceSummary[]): InvoiceSummary[] {
  return list.sort((a, b) => b.competencia.localeCompare(a.competencia) || b.dueDate.localeCompare(a.dueDate));
}

function toDetail(fatura: FaturaDetail, snapshotInvoice: SnapshotInvoice | undefined): InvoiceDetail {
  const summary = toSummary(fatura);
  const utilityAmount = fatura.valor_distribuidora ?? snapshotInvoice?.valor_distribuidora ?? 0;
  const origin = (fatura.origem_portal ?? snapshotInvoice?.origem ?? "ACVEL").toUpperCase() === "DIGITAL_GRID" ? "DIGITAL_GRID" : "ACVEL";
  return {
    ...summary,
    holderName: fatura.uc?.titular ?? "",
    billingMode: billingModeOf(fatura.modo_cobranca),
    origin,
    items: (fatura.itens_cobranca ?? []).map((item) => ({
      kind: (item.tipo ?? "").toUpperCase() === "CONCESSIONARIA" ? "CONCESSIONARIA" : "ACVEL",
      description: item.descricao ?? "Item da fatura",
      amount: item.valor
    })),
    utilityAmount,
    savings: fatura.economia_reais ?? snapshotInvoice?.economia_reais ?? fatura.desconto_aplicado ?? 0,
    compensatedKwh: fatura.credito_compensado_kwh ?? fatura.energia_compensada_kwh ?? snapshotInvoice?.energia_compensada_kwh ?? null,
    consumptionKwh: fatura.consumo_kwh ?? snapshotInvoice?.consumo_kwh ?? null,
    paidAt: fatura.paga_em ?? snapshotInvoice?.paga_em ?? null,
    paymentMethod: paymentMethodOf(fatura.metodo_pagamento ?? snapshotInvoice?.metodo_pagamento ?? null),
    // PREVIEW = boleto not yet confirmed at the bank; the API blocks the download.
    // Digital Grid bills are not downloadable by consumers (403 on faturas-distribuidora).
    pdfAvailable: origin === "ACVEL" && (fatura.pdf_status ?? "DISPONIVEL").toUpperCase() !== "PREVIEW",
    utilityBill:
      fatura.fatura_distribuidora_referencia && fatura.fatura_distribuidora_referencia.valorTotal !== null
        ? { amount: fatura.fatura_distribuidora_referencia.valorTotal, dueDate: (fatura.fatura_distribuidora_referencia.vencimento ?? "").slice(0, 10) }
        : null
  };
}

function snapshotToDetail(invoice: SnapshotInvoice, snapshot: Snapshot): InvoiceDetail {
  const uc = snapshot.ucs.find((candidate) => candidate.id === invoice.uc_id);
  return {
    ...snapshotToSummary(invoice, snapshot),
    holderName: uc?.titular ?? "",
    billingMode: "UNIFICADA",
    origin: (invoice.origem ?? "ACVEL").toUpperCase() === "DIGITAL_GRID" ? "DIGITAL_GRID" : "ACVEL",
    items: [],
    utilityAmount: invoice.valor_distribuidora ?? 0,
    savings: invoice.economia_reais,
    compensatedKwh: invoice.energia_compensada_kwh,
    consumptionKwh: invoice.consumo_kwh,
    paidAt: invoice.paga_em,
    paymentMethod: paymentMethodOf(invoice.metodo_pagamento),
    // The snapshot links ACVEL invoices to /v1/faturas/{id}/pdf (the path downloadPdf uses).
    pdfAvailable: hasAcvelInvoicePdf(invoice),
    utilityBill: null
  };
}

// ── Service ────────────────────────────────────────────────────────────

export const remoteInvoiceService: InvoiceService = {
  async getInvoices(filters) {
    let invoices: InvoiceSummary[] = [];
    try {
      // Swagger: page, perPage/per_page, status — no competência filter, so the period is applied here.
      const faturas = await api.get("rateio", "/v1/faturas/me", zList(faturaSchema), {
        query: { page: 1, perPage: 100, per_page: 100, status: filters.status === "PAID" ? "PAGA" : undefined }
      });
      const oldest = firstCompetencia(filters.periodMonths);
      invoices = faturas.filter(isConsumerInvoice).map(toSummary).filter((invoice) => inPeriod(invoice, oldest));
    } catch (error) {
      if (!isAppError(error, "RESOURCE_NOT_FOUND")) throw error;
    }
    if (invoices.length === 0) {
      // Legacy customers may only have invoices in the operational snapshot.
      const snapshot = await fetchSnapshot();
      const oldest = firstCompetencia(filters.periodMonths);
      invoices = snapshot.invoices.map((invoice) => snapshotToSummary(invoice, snapshot)).filter((invoice) => inPeriod(invoice, oldest));
    }
    return sortNewestFirst(invoices.filter((invoice) => matchesFilter(invoice.status, filters.status)));
  },

  async getInvoice(invoiceId) {
    const [faturaResult, snapshotResult] = await Promise.allSettled([
      api.get("rateio", `/v1/faturas/${encodeURIComponent(invoiceId)}`, faturaDetailSchema),
      fetchSnapshot()
    ]);
    const snapshot = snapshotResult.status === "fulfilled" ? snapshotResult.value : null;
    const snapshotInvoice = snapshot?.invoices.find((invoice) => invoice.id === invoiceId);
    if (faturaResult.status === "fulfilled") return toDetail(faturaResult.value, snapshotInvoice);
    if (snapshot && snapshotInvoice) return snapshotToDetail(snapshotInvoice, snapshot);
    throw faturaResult.reason;
  },

  downloadInvoicePdf: (invoiceId) => downloadAuthenticatedFile("rateio", `/v1/faturas/${encodeURIComponent(invoiceId)}/pdf`, `fatura-acvel-${invoiceId}.pdf`),

  async getExistingPix(invoiceId) {
    const [charge, invoice] = await Promise.all([fetchCharge(invoiceId, "pix"), remoteInvoiceService.getInvoice(invoiceId)]);
    // No charge: the charge status is never derived from the invoice status (the screen gates paid invoices).
    if (!charge) return { invoiceId, amount: invoice.amount, emvCode: "", expiresAt: null, status: "PROCESSANDO", invoiceStatus: invoice.status };
    const emvCode = pixPayloadOf(charge);
    const status = chargeStatusOf(charge.status);
    return {
      invoiceId,
      amount: charge.valor ?? invoice.amount,
      emvCode,
      expiresAt: charge.pix_expira_em,
      // A pending charge without a Pix payload is still being registered at the bank.
      status: status === "AGUARDANDO" && !emvCode ? "PROCESSANDO" : status,
      invoiceStatus: invoice.status
    };
  },

  async getPaymentStatus(invoiceId) {
    const charge = await fetchCharge(invoiceId, "pix");
    if (!charge) return "PROCESSANDO";
    const status = chargeStatusOf(charge.status);
    return status === "AGUARDANDO" && !pixPayloadOf(charge) ? "PROCESSANDO" : status;
  },

  async getExistingBoleto(invoiceId) {
    const [charge, invoice] = await Promise.all([fetchCharge(invoiceId, "boleto"), remoteInvoiceService.getInvoice(invoiceId)]);
    const digitableLine = onlyDigits(charge?.boleto_linha_digitavel ?? "");
    const rawStatus = charge ? chargeStatusOf(charge.status) : "PROCESSANDO";
    const pdf = charge?.boleto_url_pdf ?? charge?.boleto_pdf_url ?? null;
    const boleto: BoletoCharge = {
      invoiceId,
      amount: charge?.valor ?? invoice.amount,
      dueDate: invoice.dueDate,
      digitableLine,
      barcode: onlyDigits(charge?.boleto_codigo ?? charge?.boleto_codigo_barras ?? "") || barcodeFromDigitableLine(digitableLine) || "",
      status: rawStatus === "AGUARDANDO" && !digitableLine ? "PROCESSANDO" : rawStatus,
      invoiceStatus: invoice.status,
      pdfUrl: pdf && /^https:\/\//.test(pdf) ? pdf : null
    };
    return boleto;
  },

  async getPaymentHistory() {
    const [chargesResult, snapshot] = await Promise.all([
      api.get("rateio", "/v1/pagamentos/cobrancas", zList(cobrancaSchema), { query: { status: "CONFIRMADO", perPage: 100 } }).then(
        (charges) => ({ ok: true as const, charges }),
        (error: unknown) => ({ ok: false as const, error })
      ),
      fetchSnapshot()
    ]);
    const invoicesById = new Map(snapshot.invoices.map((invoice) => [invoice.id, invoice] as const));

    if (chargesResult.ok && chargesResult.charges.length > 0) {
      // Confirmed charges carry the real payment method and confirmation time.
      return chargesResult.charges
        .map((charge): PaymentRecord => {
          const invoice = charge.fatura_id ? invoicesById.get(charge.fatura_id) : undefined;
          return {
            id: charge.id,
            invoiceId: charge.fatura_id ?? "",
            competencia: normaliseCompetencia(invoice?.competencia ?? null),
            amount: charge.valor ?? invoice?.valor_total ?? 0,
            paidAt: charge.confirmado_em ?? invoice?.paga_em ?? null,
            method: paymentMethodOf(charge.metodo)
          };
        })
        .sort((a, b) => (b.paidAt ?? b.competencia).localeCompare(a.paidAt ?? a.competencia));
    }
    if (!chargesResult.ok && !isAppError(chargesResult.error, "RESOURCE_NOT_FOUND") && !isAppError(chargesResult.error, "FORBIDDEN")) throw chargesResult.error;

    // Legacy customers: paid invoices from the operational snapshot.
    return snapshot.invoices
      .filter((invoice) => snapshotInvoiceStatus(invoice) === "PAGO")
      .map(
        (invoice): PaymentRecord => ({
          id: `payment-${invoice.id}`,
          invoiceId: invoice.id,
          competencia: normaliseCompetencia(invoice.competencia),
          amount: invoice.valor_total,
          paidAt: invoice.paga_em,
          method: paymentMethodOf(invoice.metodo_pagamento)
        })
      )
      .sort((a, b) => (b.paidAt ?? b.competencia).localeCompare(a.paidAt ?? a.competencia));
  }
};

