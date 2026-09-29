import { useRouter } from "expo-router";
import { Barcode, History, QrCode, Receipt } from "lucide-react-native";
import { ACVELCard, ListItem, QueryView, Screen } from "@/components";
import { usePayments } from "@/features/invoices/hooks/useInvoices";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { routes } from "@/navigation/routes";
import { formatCompetenciaLong, formatCurrency, formatDateTime } from "@/utils/format";

const METHOD = { PIX: { label: "Pix", icon: QrCode }, BOLETO: { label: "Boleto", icon: Barcode } } as const;
const UNKNOWN_METHOD = { label: "Pagamento", icon: Receipt } as const;

export default function PaymentsHistoryScreen() {
  const router = useRouter();
  const payments = usePayments();
  const refresh = useRefreshControl(payments);

  return (
    <Screen {...refresh}>
      <QueryView
        query={payments}
        loadingRows={6}
        isEmpty={(list) => list.length === 0}
        empty={{ icon: History, title: "Nenhum pagamento ainda", message: "Os pagamentos confirmados aparecem aqui com data e forma de pagamento." }}
      >
        {(list) => (
          <ACVELCard padding="xs">
            {list.map((payment, index) => {
              const method = payment.method ? METHOD[payment.method] : UNKNOWN_METHOD;
              return (
                <ListItem
                  key={payment.id}
                  icon={method.icon}
                  iconTone="success"
                  title={`Fatura de ${formatCompetenciaLong(payment.competencia)}`}
                  subtitle={payment.paidAt ? `${method.label} · ${formatDateTime(payment.paidAt)}` : `${method.label} · pago`}
                  value={formatCurrency(payment.amount)}
                  onPress={() => router.push(routes.invoice(payment.invoiceId))}
                  divider={index < list.length - 1}
                />
              );
            })}
          </ACVELCard>
        )}
      </QueryView>
    </Screen>
  );
}
