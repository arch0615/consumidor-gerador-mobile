import type { ChargeStatus, InvoiceStatus } from "@/types/domain";

export type PaymentScreenGate = "ALREADY_PAID" | "PAYMENT_FLOW";

/**
 * Decides whether a Pix/Boleto screen may offer payment. A paid invoice (e.g. opened through a
 * deep link) never offers payment, whatever its charge says: the backend may still report the
 * charge as PENDENTE for an invoice that is PAGA. The charge status is left untouched — only a
 * confirmation observed in this session (Pix polling) keeps the payment-confirmed flow.
 */
export function paymentScreenGate(invoiceStatus: InvoiceStatus, confirmedInSession: ChargeStatus | undefined = undefined): PaymentScreenGate {
  if (confirmedInSession === "CONFIRMADO") return "PAYMENT_FLOW";
  return invoiceStatus === "PAGO" ? "ALREADY_PAID" : "PAYMENT_FLOW";
}
