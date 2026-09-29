import { useRouter } from "expo-router";
import { QrCode } from "lucide-react-native";
import { View } from "react-native";
import { ACVELButton, ACVELCard, AppText, StatusChip } from "@/components";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import type { InvoiceSummary } from "@/types/domain";
import { formatCompetenciaLong, formatCurrency, formatDate, formatDueIn } from "@/utils/format";
import { INVOICE_STATUS } from "@/utils/status-labels";

/** Next / open invoice with its primary payment action (Home + Faturas header). */
export function InvoiceHighlightCard({ invoice }: { invoice: InvoiceSummary }) {
  const theme = useTheme();
  const router = useRouter();
  const payable = invoice.status === "PENDENTE" || invoice.status === "ATRASADO";
  const overdue = invoice.status === "ATRASADO";

  return (
    <ACVELCard>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: theme.spacing.sm }}>
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <AppText variant="footnote" tone="secondary">
              Fatura de {formatCompetenciaLong(invoice.competencia)}
            </AppText>
            <AppText variant="title1">{formatCurrency(invoice.amount)}</AppText>
          </View>
          <StatusChip status={INVOICE_STATUS[invoice.status]} />
        </View>
        <AppText variant="subhead" tone={overdue ? "danger" : "secondary"}>
          {overdue ? `Venceu em ${formatDate(invoice.dueDate)}` : `${formatDueIn(invoice.dueDate)} · ${formatDate(invoice.dueDate)}`}
        </AppText>
        <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
          {payable ? (
            <View style={{ flex: 1 }}>
              <ACVELButton label="Pagar com Pix" icon={QrCode} size="md" onPress={() => router.push(routes.invoicePix(invoice.id))} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <ACVELButton label="Ver detalhes" variant="secondary" size="md" onPress={() => router.push(routes.invoice(invoice.id))} />
          </View>
        </View>
      </View>
    </ACVELCard>
  );
}
