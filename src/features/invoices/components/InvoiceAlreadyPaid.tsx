import { ReceiptText } from "lucide-react-native";
import { EmptyState } from "@/components";

export interface InvoiceAlreadyPaidProps {
  onViewInvoice: () => void;
}

/** Neutral state for payment screens opened for an invoice that is already paid (no payment actions). */
export function InvoiceAlreadyPaid({ onViewInvoice }: InvoiceAlreadyPaidProps) {
  return <EmptyState icon={ReceiptText} title="Fatura já paga" message="Esta fatura consta como paga. Não é necessário realizar um novo pagamento." action={{ label: "Ver fatura", onPress: onViewInvoice }} />;
}
