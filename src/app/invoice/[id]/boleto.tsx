import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { CircleCheck, CircleX, Download, Headset, Hourglass, RefreshCw, Share2 } from "lucide-react-native";
import { Share, View } from "react-native";
import { ACVELButton, ACVELCard, AppText, CopyField, EmptyState, InfoCard, QueryView, Screen, StatusChip } from "@/components";
import { ItfBarcode } from "@/features/invoices/components/ItfBarcode";
import { useBoleto } from "@/features/invoices/hooks/useInvoices";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useRouteId } from "@/hooks/useRouteId";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import { formatCurrency, formatDate, formatDigitableLine } from "@/utils/format";
import { CHARGE_STATUS } from "@/utils/status-labels";

export default function BoletoPaymentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const invoiceId = useRouteId();
  const boleto = useBoleto(invoiceId);
  const refresh = useRefreshControl(boleto);

  return (
    <Screen {...refresh}>
      <QueryView query={boleto} loading="detail" errorTitle="Não foi possível carregar o boleto">
        {(charge) => {
          if (charge.status === "CONFIRMADO") {
            return <EmptyState icon={CircleCheck} title="Fatura paga" message="Recebemos o pagamento desta fatura." action={{ label: "Ver fatura", onPress: () => router.back() }} />;
          }
          if (charge.status === "FALHOU") {
            return (
              <EmptyState
                icon={CircleX}
                title="Boleto indisponível"
                message="Não foi possível registrar o boleto desta fatura. Tente novamente mais tarde ou fale com o suporte."
                action={{ label: "Tentar novamente", icon: RefreshCw, onPress: () => void boleto.refetch() }}
                secondaryAction={{ label: "Falar com o suporte", icon: Headset, onPress: () => router.push(routes.newTicket) }}
              />
            );
          }
          if (charge.status === "PROCESSANDO" || !charge.digitableLine) {
            return (
              <EmptyState
                icon={Hourglass}
                title="Estamos gerando seu boleto"
                message="O código de barras aparece aqui assim que o banco concluir o registro."
                action={{ label: "Atualizar", icon: RefreshCw, onPress: () => void boleto.refetch() }}
              />
            );
          }
          return (
            <View style={{ gap: theme.spacing.lg }}>
              <View style={{ alignItems: "center", gap: theme.spacing.xxs }}>
                <AppText variant="subhead" tone="secondary">
                  Valor do boleto
                </AppText>
                <AppText variant="display">{formatCurrency(charge.amount)}</AppText>
                {charge.dueDate ? (
                  <AppText variant="subhead" tone="secondary">
                    Vencimento {formatDate(charge.dueDate)}
                  </AppText>
                ) : null}
                <View style={{ marginTop: theme.spacing.xs }}>
                  <StatusChip status={CHARGE_STATUS[charge.status]} size="sm" />
                </View>
              </View>

              {charge.status === "EXPIRADO" ? <InfoCard tone="warning" title="Boleto vencido" message="Após o vencimento o banco pode recusar o pagamento. Prefira pagar com Pix ou fale com o suporte." /> : null}

              <ACVELCard>
                <View style={{ gap: theme.spacing.md }}>
                  {charge.barcode ? <ItfBarcode digits={charge.barcode} /> : null}
                  <CopyField
                    label="Linha digitável"
                    value={charge.digitableLine}
                    displayValue={formatDigitableLine(charge.digitableLine)}
                    copyLabel="Copiar número do boleto"
                    copiedMessage="Número do boleto copiado"
                    primary
                  />
                </View>
              </ACVELCard>

              {charge.pdfUrl ? (
                <ACVELButton label="Baixar boleto (PDF)" variant="secondary" icon={Download} onPress={() => charge.pdfUrl && void WebBrowser.openBrowserAsync(charge.pdfUrl)} />
              ) : null}
              <ACVELButton
                label="Compartilhar boleto"
                variant="secondary"
                icon={Share2}
                onPress={() => void Share.share({ message: `Boleto ACVEL — ${formatCurrency(charge.amount)}${charge.dueDate ? `, vencimento ${formatDate(charge.dueDate)}` : ""}.\nLinha digitável: ${charge.digitableLine}` })}
              />
              <InfoCard tone="info" title="Compensação em até 3 dias úteis" message="Prefere confirmação imediata? Pague com Pix na tela anterior." />
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}
