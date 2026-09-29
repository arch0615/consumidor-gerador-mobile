import { useRouter } from "expo-router";
import { config } from "@/config/env";
import { CircleX, Clock, Headset, Hourglass, RefreshCw } from "lucide-react-native";
import { useEffect } from "react";
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { ACVELCard, AppText, CopyField, EmptyState, InfoCard, ListItem, QueryView, Screen, SectionHeader, StatusChip } from "@/components";
import { PaymentConfirmed } from "@/features/invoices/components/PaymentConfirmed";
import { usePixCharge, usePixStatus } from "@/features/invoices/hooks/useInvoices";
import { formatCountdown, useCountdown } from "@/hooks/useCountdown";
import { useRouteId } from "@/hooks/useRouteId";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import type { ChargeStatus } from "@/types/domain";
import { formatCurrency } from "@/utils/format";
import { CHARGE_STATUS } from "@/utils/status-labels";

const QR_SIZE = 216;
const STEPS = ["Abra o app do seu banco e escolha pagar com Pix.", "Escaneie o QR Code ou use o Pix copia e cola.", "Confira o valor e confirme. A confirmação aparece aqui."] as const;

export default function PixPaymentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const invoiceId = useRouteId();
  const pix = usePixCharge(invoiceId);
  const secondsLeft = useCountdown(pix.data?.expiresAt ?? undefined);
  const hasExpiry = Boolean(pix.data?.expiresAt);
  const expiredLocally = hasExpiry && secondsLeft === 0;
  const pollable = pix.data !== undefined && pix.data.status !== "CONFIRMADO" && pix.data.status !== "FALHOU" && !expiredLocally;
  const status = usePixStatus(invoiceId, pollable);

  const chargeStatus: ChargeStatus = status.data === "CONFIRMADO" ? "CONFIRMADO" : expiredLocally ? "EXPIRADO" : (status.data ?? pix.data?.status ?? "AGUARDANDO");

  // A charge that finished registering at the bank now has a Pix payload: reload it.
  const reloadCharge = pix.refetch;
  const chargeWasProcessing = pix.data?.status === "PROCESSANDO";
  useEffect(() => {
    if (chargeWasProcessing && status.data === "AGUARDANDO") void reloadCharge();
  }, [chargeWasProcessing, status.data, reloadCharge]);

  return (
    <Screen>
      <QueryView query={pix} loading="detail" errorTitle="Não foi possível carregar o Pix">
        {(charge) => {
          if (chargeStatus === "CONFIRMADO") {
            return <PaymentConfirmed amount={charge.amount} onViewInvoice={() => router.back()} onGoHome={() => router.navigate(routes.home)} />;
          }
          if (chargeStatus === "EXPIRADO") {
            return (
              <EmptyState
                icon={Clock}
                title="Código Pix expirado"
                message="Por segurança, o código tem validade. Atualize para obter um código válido ou pague com boleto."
                action={{ label: "Atualizar código", icon: RefreshCw, onPress: () => void pix.refetch() }}
                secondaryAction={{ label: "Pagar com boleto", onPress: () => router.replace(routes.invoiceBoleto(invoiceId)) }}
              />
            );
          }
          if (chargeStatus === "FALHOU") {
            return (
              <EmptyState
                icon={CircleX}
                title="Cobrança indisponível"
                message="Não foi possível gerar a cobrança desta fatura. Tente novamente mais tarde ou fale com o suporte."
                action={{ label: "Tentar novamente", icon: RefreshCw, onPress: () => void pix.refetch() }}
                secondaryAction={{ label: "Falar com o suporte", icon: Headset, onPress: () => router.push(routes.newTicket) }}
              />
            );
          }
          if (chargeStatus === "PROCESSANDO" || !charge.emvCode) {
            return (
              <EmptyState
                icon={Hourglass}
                title="Estamos gerando sua cobrança"
                message="O código Pix aparece aqui assim que o banco concluir o registro. Isso costuma levar poucos minutos."
                action={{ label: "Atualizar", icon: RefreshCw, onPress: () => void pix.refetch() }}
              />
            );
          }
          return (
            <View style={{ gap: theme.spacing.lg }}>
              <View style={{ alignItems: "center", gap: theme.spacing.xxs }}>
                <AppText variant="subhead" tone="secondary">
                  Valor a pagar
                </AppText>
                <AppText variant="display">{formatCurrency(charge.amount)}</AppText>
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
                  <StatusChip status={CHARGE_STATUS[chargeStatus]} size="sm" />
                  {hasExpiry ? (
                    <AppText variant="footnote" tone="secondary" accessibilityLabel={`Expira em ${Math.ceil(secondsLeft / 60)} minutos`}>
                      Expira em {formatCountdown(secondsLeft)}
                    </AppText>
                  ) : null}
                </View>
              </View>

              <ACVELCard>
                <View style={{ alignItems: "center", gap: theme.spacing.md }}>
                  <View style={{ padding: theme.spacing.sm, backgroundColor: "#FFFFFF", borderRadius: theme.radius.md }} accessible accessibilityRole="image" accessibilityLabel="QR Code Pix para pagamento">
                    <QRCode value={charge.emvCode} size={QR_SIZE} color="#000000" backgroundColor="#FFFFFF" ecl="M" />
                  </View>
                  <CopyField label="Pix copia e cola" value={charge.emvCode} copyLabel="Copiar código Pix" copiedMessage="Código Pix copiado" primary numberOfLines={2} />
                </View>
              </ACVELCard>

              <View style={{ gap: theme.spacing.xs }}>
                <SectionHeader title="Como pagar" />
                <ACVELCard padding="xs">
                  {STEPS.map((step, index) => (
                    <ListItem key={step} title={`${index + 1}. ${step}`} divider={index < STEPS.length - 1} />
                  ))}
                </ACVELCard>
              </View>

              {status.isError ? <InfoCard tone="warning" title="Não conseguimos verificar o pagamento" message="Vamos tentar de novo automaticamente. Se já pagou, a confirmação aparece em instantes." /> : null}
              {config.useMocks ? <InfoCard tone="info" title="Modo demonstração" message="O pagamento é confirmado automaticamente cerca de 20 segundos após abrir esta tela." /> : null}
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}
