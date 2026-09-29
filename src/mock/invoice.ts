import type { BoletoCharge, InvoiceDetail, PaymentRecord, PixCharge } from "@/types/domain";
import { demoProfile } from "./consumer";
import { dueDateFor, TODAY } from "./calendar";
import { ENERGY_HISTORY } from "./energy-history";
import { residences } from "./residence";

const primary = residences[0];

function invoiceId(competencia: string): string {
  return `inv_${competencia.replace("-", "_")}`;
}

/**
 * ACVEL invoices for the primary unit (unified billing: ACVEL energy +
 * utility pass-through on one bill). The two most recent are open — the
 * older one overdue once its due date passes — so every status is visible.
 */
export const invoices: InvoiceDetail[] = ENERGY_HISTORY.slice()
  .reverse()
  .map((month, index) => {
    const dueDate = dueDateFor(month.competencia);
    const open = index < 2;
    const amount = Math.round((month.acvelCost + month.utilityCost) * 100) / 100;
    const paidAt = open ? null : `${dueDate}T14:${String(10 + index).padStart(2, "0")}:00-03:00`;
    return {
      id: invoiceId(month.competencia),
      competencia: month.competencia,
      amount,
      dueDate,
      status: open ? (dueDate < TODAY ? "ATRASADO" : "PENDENTE") : "PAGO",
      ucNumber: primary?.ucNumber ?? "",
      utility: primary?.utility ?? "",
      holderName: demoProfile.displayName,
      billingMode: "UNIFICADA",
      origin: "ACVEL",
      items: [
        { kind: "ACVEL", description: `Energia compensada (${month.compensatedKwh} kWh)`, amount: month.acvelCost },
        { kind: "CONCESSIONARIA", description: "Conta Enel — repasse", amount: month.utilityCost }
      ],
      utilityAmount: month.utilityCost,
      savings: month.savings,
      compensatedKwh: month.compensatedKwh,
      consumptionKwh: month.consumptionKwh,
      paidAt,
      paymentMethod: open ? null : index % 3 === 0 ? "BOLETO" : "PIX",
      pdfAvailable: true,
      utilityBill: { amount: month.utilityCost, dueDate: dueDateFor(month.competencia, 5) }
    } satisfies InvoiceDetail;
  });

export function paymentRecords(): PaymentRecord[] {
  return invoices
    .filter((invoice) => invoice.status === "PAGO" && invoice.paidAt && invoice.paymentMethod)
    .map((invoice) => ({
      id: `pay_${invoice.id}`,
      invoiceId: invoice.id,
      competencia: invoice.competencia,
      amount: invoice.amount,
      paidAt: invoice.paidAt ?? "",
      method: invoice.paymentMethod ?? "PIX"
    }));
}

/** Deterministic digit string for fake barcodes. */
function digitsFrom(seed: string, length: number): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000_007;
  let out = "";
  while (out.length < length) {
    hash = (hash * 48_271) % 2_147_483_647;
    out += String(hash % 10);
  }
  return out;
}

export function buildPixCharge(invoice: InvoiceDetail): PixCharge {
  const amount = invoice.amount.toFixed(2);
  return {
    invoiceId: invoice.id,
    amount: invoice.amount,
    // Static EMV-like payload for UI purposes only (not a payable code).
    emvCode: `00020126580014br.gov.bcb.pix0136acvel-demo-${invoice.id}520400005303986540${amount.length}${amount}5802BR5925ACVEL ENERGIA DEMO6009SAO PAULO62070503***6304${digitsFrom(invoice.id, 4)}`,
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    status: "AGUARDANDO"
  };
}

export function buildBoletoCharge(invoice: InvoiceDetail): BoletoCharge {
  const cents = String(Math.round(invoice.amount * 100)).padStart(10, "0");
  const barcode = `0019${digitsFrom(`${invoice.id}-f`, 1)}${digitsFrom(`${invoice.id}-d`, 4)}${cents}${digitsFrom(invoice.id, 25)}`;
  return {
    invoiceId: invoice.id,
    amount: invoice.amount,
    dueDate: invoice.dueDate,
    digitableLine: `${digitsFrom(`${invoice.id}-l`, 33)}${digitsFrom(`${invoice.id}-d`, 4)}${cents}`,
    barcode,
    status: "AGUARDANDO",
    pdfUrl: null
  };
}
