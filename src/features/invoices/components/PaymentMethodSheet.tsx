import { useRouter } from "expo-router";
import { Barcode, QrCode } from "lucide-react-native";
import { BottomSheet, ListItem } from "@/components";
import { routes } from "@/navigation/routes";
import { formatCurrency } from "@/utils/format";

export interface PaymentMethodSheetProps {
  invoiceId: string;
  amount: number;
  visible: boolean;
  onClose: () => void;
}

/** Payment method picker (Pix first — instant confirmation). */
export function PaymentMethodSheet({ invoiceId, amount, visible, onClose }: PaymentMethodSheetProps) {
  const router = useRouter();
  const go = (href: ReturnType<typeof routes.invoicePix>) => {
    onClose();
    router.push(href);
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Como você quer pagar?" description={`Valor: ${formatCurrency(amount)}`} scrollable={false}>
      <ListItem icon={QrCode} title="Pix" subtitle="Recomendado · confirmação em instantes" onPress={() => go(routes.invoicePix(invoiceId))} divider />
      <ListItem icon={Barcode} title="Boleto" subtitle="Compensação em até 3 dias úteis" onPress={() => go(routes.invoiceBoleto(invoiceId))} />
    </BottomSheet>
  );
}
