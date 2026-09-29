import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { FileSignature, Gauge, Hash, Receipt, Upload, User, Wallet, Zap } from "lucide-react-native";
import { View } from "react-native";
import { ACVELButton, ACVELCard, AppText, InfoCard, ListItem, ProgressSteps, QueryView, Screen, SectionHeader, StatusChip } from "@/components";
import { RESIDENCE_TYPE_ICON, residenceLocality } from "@/features/residences/residence-meta";
import { useResidence } from "@/features/residences/hooks/useResidences";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useRouteId } from "@/hooks/useRouteId";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import { formatAddress, formatDate, formatKwh, maskCpf } from "@/utils/format";
import { isResidenceRejected, RESIDENCE_STATUS, RESIDENCE_STEPS, RESIDENCE_TYPE_LABEL, residenceStepIndex } from "@/utils/status-labels";

const BILLING_MODE_LABEL = { UNIFICADA: "Fatura unificada (ACVEL paga a distribuidora)", SEPARADA: "Faturas separadas" } as const;

export default function ResidenceDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const residenceId = useRouteId();
  const residence = useResidence(residenceId);
  const refresh = useRefreshControl(residence);

  return (
    <Screen {...refresh}>
      <QueryView query={residence} loading="detail" errorTitle="Não foi possível carregar a unidade">
        {(unit) => {
          const status = RESIDENCE_STATUS[unit.status];
          const Icon = RESIDENCE_TYPE_ICON[unit.type];
          const rejected = isResidenceRejected(unit.status);
          return (
            <View style={{ gap: theme.spacing.lg }}>
              <ACVELCard>
                <View style={{ gap: theme.spacing.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                    <View style={{ width: 48, height: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                      <Icon size={theme.sizing.iconLg} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="title3">{RESIDENCE_TYPE_LABEL[unit.type]}</AppText>
                      <AppText variant="footnote" tone="secondary">
                        {unit.editable ? `Cadastrada em ${formatDate(unit.submittedAt.slice(0, 10))}` : "Unidade ativa no faturamento"}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="subhead">{unit.address.street ? formatAddress(unit.address) : residenceLocality(unit)}</AppText>
                  <StatusChip status={status} />
                </View>
              </ACVELCard>

              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Andamento" />
                <ACVELCard>
                  <View style={{ gap: theme.spacing.md }}>
                    <ProgressSteps variant="stepper" steps={RESIDENCE_STEPS} current={residenceStepIndex(unit.status)} />
                    <AppText variant="subhead" tone={rejected ? "danger" : "secondary"}>
                      {status.nextStep}
                    </AppText>
                  </View>
                </ACVELCard>
                {rejected ? (
                  <InfoCard
                    tone="danger"
                    title="Motivo da reprovação"
                    message={unit.rejectionReason ?? "Revise os dados da unidade e reenvie para análise."}
                    {...(unit.editable ? { actionLabel: "Corrigir cadastro", onAction: () => router.push(routes.editResidence(unit.id)) } : {})}
                  />
                ) : null}
                {unit.status === "AGUARDANDO_ASSINATURA" && unit.contractSigningUrl ? (
                  <ACVELButton label="Assinar contrato" icon={FileSignature} onPress={() => unit.contractSigningUrl && void WebBrowser.openBrowserAsync(unit.contractSigningUrl)} />
                ) : null}
                {rejected ? <ACVELButton label="Reenviar documentos" variant="secondary" icon={Upload} onPress={() => router.push(routes.documents)} /> : null}
              </View>

              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Dados da unidade" />
                <ACVELCard padding="xs">
                  <ListItem icon={Hash} title="Número da instalação (UC)" subtitle={unit.ucNumber} divider />
                  <ListItem icon={Zap} title="Distribuidora" subtitle={unit.utility} divider />
                  <ListItem icon={User} title="Titular" subtitle={`${unit.holderName} · ${unit.holderDocument.length === 11 ? maskCpf(unit.holderDocument) : unit.holderDocument}`} divider />
                  <ListItem icon={Gauge} title="Consumo médio" subtitle={unit.averageConsumptionKwh ? `${formatKwh(unit.averageConsumptionKwh)}/mês` : "Não informado"} divider />
                  <ListItem icon={Wallet} title="Cobrança" subtitle={unit.billingMode ? BILLING_MODE_LABEL[unit.billingMode] : "Definida na ativação da unidade"} />
                </ACVELCard>
              </View>

              {unit.status === "ATIVA_COMPENSANDO" ? <ACVELButton label="Ver faturas" variant="secondary" icon={Receipt} onPress={() => router.navigate(routes.invoices)} /> : null}
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}
