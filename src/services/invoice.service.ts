import { config } from "@/config/env";
import type { BoletoCharge, ChargeStatus, InvoiceDetail, InvoiceFilters, InvoiceSummary, PaymentRecord, PixCharge } from "@/types/domain";
import { mockInvoiceService } from "./mock/invoice.mock";
import { remoteInvoiceService } from "./remote/invoice.remote";

/**
 * Invoices & payments.
 * API (rateio): GET /v1/faturas/me, GET /v1/faturas/{id}, GET /v1/faturas/{id}/pdf (Bearer, binary),
 *   GET /v1/pagamentos/cobrancas?fatura_id= (the bank charge — Pix + boleto — created when the
 *   invoice is closed; the app only reads it and polls its status).
 * API (business): GET /v1/consumidores/me/rateio-snapshot (fallback list, kWh/savings, payment history).
 */
export interface InvoiceService {
  list(filters: InvoiceFilters): Promise<InvoiceSummary[]>;
  get(invoiceId: string): Promise<InvoiceDetail>;
  /** Downloads the official PDF and returns a local file URI. */
  downloadPdf(invoiceId: string): Promise<string>;
  getPixCharge(invoiceId: string): Promise<PixCharge>;
  getChargeStatus(invoiceId: string): Promise<ChargeStatus>;
  getBoleto(invoiceId: string): Promise<BoletoCharge>;
  listPayments(): Promise<PaymentRecord[]>;
}

export const invoiceService: InvoiceService = config.useMocks ? mockInvoiceService : remoteInvoiceService;
