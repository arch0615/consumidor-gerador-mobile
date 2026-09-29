import { Receipt } from "lucide-react-native";
import { View } from "react-native";
import { AppText, ListItem, StatusChip } from "@/components";
import { useTheme } from "@/theme";
import type { InvoiceSummary } from "@/types/domain";
import { formatCompetenciaLong, formatCurrency, formatDate } from "@/utils/format";
import { INVOICE_STATUS } from "@/utils/status-labels";

/** Invoice list row: month + due date on the left, amount over status on the right. */
export function InvoiceRow({ invoice, onPress, divider }: { invoice: InvoiceSummary; onPress: () => void; divider: boolean }) {
  const theme = useTheme();
  const status = INVOICE_STATUS[invoice.status];
  const month = formatCompetenciaLong(invoice.competencia);
  const due = `${invoice.status === "PAGO" ? "Venceu" : "Vence"} em ${formatDate(invoice.dueDate)}`;
  const amount = formatCurrency(invoice.amount);
  return (
    <ListItem
      icon={Receipt}
      iconTone={status.tone === "neutral" ? "brand" : status.tone}
      title={month}
      subtitle={due}
      accessibilityLabel={`Fatura de ${month}, ${amount}, ${status.label}, ${due}`}
      trailing={
        <View style={{ alignItems: "flex-end", gap: theme.spacing.xxs }}>
          <AppText variant="bodyStrong">{amount}</AppText>
          <StatusChip status={status} size="sm" />
        </View>
      }
      onPress={onPress}
      divider={divider}
    />
  );
}
