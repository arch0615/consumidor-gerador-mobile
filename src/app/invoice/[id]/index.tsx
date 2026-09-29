import { useRouter } from "expo-router";
import { Building, Download, Headset, Leaf, PiggyBank, Wallet, Zap } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ACVELButton, ACVELCard, AppText, Columns, InfoCard, ListItem, MetricCard, QueryView, Screen, SectionHeader, StatusChip } from "@/components";
import { PaymentMethodSheet } from "@/features/invoices/components/PaymentMethodSheet";
import { useInvoice, useOpenInvoicePdf } from "@/features/invoices/hooks/useInvoices";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useRouteId } from "@/hooks/useRouteId";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";
import { formatCompetenciaLong, formatCurrency, formatDate, formatDateTime, formatDueIn, formatKwh } from "@/utils/format";
import { INVOICE_STATUS } from "@/utils/status-labels";

const PAYMENT_METHOD_LABEL = { PIX: "Pix", BOLETO: "Boleto" } as const;

export default function InvoiceDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const invoiceId = useRouteId();
  const invoice = useInvoice(invoiceId);
  const openPdf = useOpenInvoicePdf();
  const refresh = useRefreshControl(invoice);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const payable = invoice.data?.status === "PENDENTE" || invoice.data?.status === "ATRASADO";

  return (
    <Screen {...refresh} footer={payable ? <ACVELButton label="Pagar fatura" icon={Wallet} onPress={() => setPaySheetOpen(true)} /> : undefined}>
      <QueryView query={invoice} loading="detail" errorTitle="Não foi possível carregar a fatura">
        {(detail) => (
          <View style={{ gap: theme.spacing.lg }}>
            <ACVELCard>
              <View style={{ gap: theme.spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <AppText variant="subheadStrong" tone="secondary">
                    {formatCompetenciaLong(detail.competencia)}
                  </AppText>
                  <StatusChip status={INVOICE_STATUS[detail.status]} />
                </View>
                <AppText variant="display">{formatCurrency(detail.amount)}</AppText>
                <AppText variant="subhead" tone={detail.status === "ATRASADO" ? "danger" : "secondary"}>
                  {detail.status === "PAGO" && detail.paidAt
                    ? `Paga em ${formatDateTime(detail.paidAt)}${detail.paymentMethod ? ` · ${PAYMENT_METHOD_LABEL[detail.paymentMethod]}` : ""}`
                    : detail.status === "ATRASADO"
                      ? `Venceu em ${formatDate(detail.dueDate)}`
                      : `${formatDueIn(detail.dueDate)} · ${formatDate(detail.dueDate)}`}
                </AppText>
              </View>
            </ACVELCard>

            {detail.savings > 0 ? (
              <InfoCard tone="success" icon={PiggyBank} title={`Você economizou ${formatCurrency(detail.savings)}`} message="Comparado ao valor que pagaria sem a ACVEL neste mês." />
            ) : null}

            {detail.consumptionKwh !== null || detail.compensatedKwh !== null ? (
              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Energia do mês" />
                <Columns>
                  {detail.consumptionKwh !== null ? <MetricCard label="Consumo" value={formatKwh(detail.consumptionKwh)} icon={Zap} compact /> : null}
                  {detail.compensatedKwh !== null ? <MetricCard label="Compensada" value={formatKwh(detail.compensatedKwh)} icon={Leaf} compact /> : null}
                </Columns>
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="Composição" subtitle={detail.billingMode === "UNIFICADA" ? "Fatura unificada: a ACVEL paga a distribuidora por você" : undefined} />
              <ACVELCard padding="xs">
                {detail.items.map((item) => (
                  <ListItem key={item.description} title={item.description} subtitle={item.kind === "ACVEL" ? "ACVEL" : detail.utility} value={formatCurrency(item.amount)} divider />
                ))}
                <ListItem title="Total" value={formatCurrency(detail.amount)} />
              </ACVELCard>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="Unidade" />
              <ACVELCard padding="xs">
                <ListItem icon={Building} title={`UC ${detail.ucNumber}`} subtitle={detail.utility} caption={detail.holderName} />
              </ACVELCard>
            </View>

            <View style={{ gap: theme.spacing.xs }}>
              <ACVELButton
                label="Baixar PDF"
                variant="secondary"
                icon={Download}
                disabled={!detail.pdfAvailable}
                loading={openPdf.isPending}
                loadingLabel="Abrindo…"
                onPress={() => openPdf.mutate(detail.id)}
              />
              {openPdf.isError ? (
                <AppText variant="footnote" tone="danger" accessibilityLiveRegion="polite">
                  {errorMessage(openPdf.error)}
                </AppText>
              ) : null}
              <ACVELButton label="Preciso de ajuda com esta fatura" variant="tertiary" icon={Headset} onPress={() => router.push(routes.newTicket)} />
            </View>

            <PaymentMethodSheet invoiceId={detail.id} amount={detail.amount} visible={paySheetOpen} onClose={() => setPaySheetOpen(false)} />
          </View>
        )}
      </QueryView>
    </Screen>
  );
}
