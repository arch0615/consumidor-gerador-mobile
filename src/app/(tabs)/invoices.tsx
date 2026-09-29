import { useRouter } from "expo-router";
import { History, Receipt } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ACVELCard, IconButton, PageHeader, QueryView, Screen, SegmentedControl, type Segment } from "@/components";
import { InvoiceRow } from "@/features/invoices/components/InvoiceRow";
import { useInvoices } from "@/features/invoices/hooks/useInvoices";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import type { InvoiceFilters } from "@/types/domain";

type StatusFilter = InvoiceFilters["status"];
type PeriodFilter = "3" | "6" | "12";

const STATUS_SEGMENTS: readonly Segment<StatusFilter>[] = [
  { value: "ALL", label: "Todas" },
  { value: "OPEN", label: "Em aberto" },
  { value: "PAID", label: "Pagas" }
];

const PERIOD_SEGMENTS: readonly Segment<PeriodFilter>[] = [
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" }
];

const EMPTY_MESSAGES: Record<StatusFilter, string> = {
  ALL: "Suas faturas aparecem aqui assim que a primeira unidade começar a compensar energia.",
  OPEN: "Você não tem faturas em aberto. Tudo em dia!",
  PAID: "Nenhuma fatura paga neste período.",
  OVERDUE: "Nenhuma fatura em atraso."
};

export default function InvoicesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [period, setPeriod] = useState<PeriodFilter>("12");
  const invoices = useInvoices({ status, periodMonths: Number(period) as InvoiceFilters["periodMonths"] });
  const refresh = useRefreshControl(invoices);

  return (
    <Screen edges={["top"]} {...refresh}>
      <PageHeader
        title="Faturas"
        subtitle="Pague com Pix ou boleto e consulte o histórico"
        trailing={<IconButton icon={History} accessibilityLabel="Histórico de pagamentos" onPress={() => router.push(routes.payments)} />}
      />
      <View style={{ gap: theme.spacing.sm }}>
        <SegmentedControl segments={STATUS_SEGMENTS} value={status} onChange={setStatus} accessibilityLabel="Filtrar por situação" />
        <SegmentedControl segments={PERIOD_SEGMENTS} value={period} onChange={setPeriod} accessibilityLabel="Filtrar por período" />
      </View>
      <QueryView
        query={invoices}
        loading="list"
        loadingRows={6}
        isEmpty={(list) => list.length === 0}
        empty={{ icon: Receipt, title: "Nenhuma fatura encontrada", message: EMPTY_MESSAGES[status] }}
      >
        {(list) => (
          <ACVELCard padding="xs">
            {list.map((invoice, index) => (
              <InvoiceRow key={invoice.id} invoice={invoice} divider={index < list.length - 1} onPress={() => router.push(routes.invoice(invoice.id))} />
            ))}
          </ACVELCard>
        )}
      </QueryView>
    </Screen>
  );
}
