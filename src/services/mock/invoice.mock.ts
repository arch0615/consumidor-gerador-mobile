import { addMonths, LAST_BILLED } from "@/mock/calendar";
import { buildBoletoCharge, buildPixCharge, invoices, paymentRecords } from "@/mock/invoice";
import type { InvoiceDetail, InvoiceFilters, InvoiceSummary, PixCharge } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import { downloadPublicFile } from "../api/file-transfer";
import type { InvoiceService } from "../invoice.service";
import { mockMutation, mockQuery } from "./mock-request";

/** Mock Pix confirms automatically this long after the charge is created. */
const PIX_AUTO_CONFIRM_MS = 20_000;
const SAMPLE_PDF_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

const pixCharges = new Map<string, { charge: PixCharge; createdAt: number }>();

function findInvoice(invoiceId: string): InvoiceDetail {
  const invoice = invoices.find((candidate) => candidate.id === invoiceId);
  if (!invoice) throw new AppError("RESOURCE_NOT_FOUND", "Fatura não encontrada.");
  return invoice;
}

function assertPayable(invoice: InvoiceDetail): void {
  if (invoice.status !== "PENDENTE" && invoice.status !== "ATRASADO") {
    throw new AppError("BUSINESS_RULE_VIOLATION", "Esta fatura não está disponível para pagamento.");
  }
}

function matchesStatus(invoice: InvoiceSummary, status: InvoiceFilters["status"]): boolean {
  switch (status) {
    case "ALL":
      return true;
    case "OPEN":
      return invoice.status === "PENDENTE" || invoice.status === "ATRASADO";
    case "PAID":
      return invoice.status === "PAGO";
    case "OVERDUE":
      return invoice.status === "ATRASADO";
  }
}

function toSummary({ id, competencia, amount, dueDate, status, ucNumber, utility }: InvoiceDetail): InvoiceSummary {
  return { id, competencia, amount, dueDate, status, ucNumber, utility };
}

/** Marks the invoice paid (what the payment webhook does on the backend). */
function settle(invoice: InvoiceDetail): void {
  invoice.status = "PAGO";
  invoice.paidAt = new Date().toISOString();
  invoice.paymentMethod = "PIX";
}

export const mockInvoiceService: InvoiceService = {
  list: (filters) =>
    mockQuery(
      () => {
        const oldest = addMonths(LAST_BILLED, -(filters.periodMonths - 1));
        return invoices.filter((invoice) => invoice.competencia >= oldest && matchesStatus(invoice, filters.status)).map(toSummary);
      },
      () => []
    ),

  get: (invoiceId) => mockQuery(() => findInvoice(invoiceId)),

  async downloadPdf(invoiceId) {
    const invoice = await mockMutation(() => findInvoice(invoiceId));
    return downloadPublicFile(SAMPLE_PDF_URL, `fatura-${invoice.competencia}.pdf`);
  },

  getPixCharge: (invoiceId) =>
    mockMutation(() => {
      const invoice = findInvoice(invoiceId);
      assertPayable(invoice);
      const existing = pixCharges.get(invoiceId);
      if (existing && existing.charge.expiresAt && Date.parse(existing.charge.expiresAt) > Date.now()) return existing.charge;
      const charge = buildPixCharge(invoice);
      pixCharges.set(invoiceId, { charge, createdAt: Date.now() });
      return charge;
    }),

  getChargeStatus: (invoiceId) =>
    mockMutation(() => {
      const invoice = findInvoice(invoiceId);
      if (invoice.status === "PAGO") return "CONFIRMADO";
      const entry = pixCharges.get(invoiceId);
      if (!entry || (entry.charge.expiresAt && Date.parse(entry.charge.expiresAt) <= Date.now())) return "EXPIRADO";
      if (Date.now() - entry.createdAt >= PIX_AUTO_CONFIRM_MS) {
        settle(invoice);
        entry.charge.status = "CONFIRMADO";
        return "CONFIRMADO";
      }
      return "AGUARDANDO";
    }),

  getBoleto: (invoiceId) =>
    mockQuery(() => {
      const invoice = findInvoice(invoiceId);
      assertPayable(invoice);
      return buildBoletoCharge(invoice);
    }),

  listPayments: () => mockQuery(paymentRecords, () => [])
};
