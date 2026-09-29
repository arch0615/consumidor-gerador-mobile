import { useRouter } from "expo-router";
import { Building, Gauge, Leaf, Zap } from "lucide-react-native";
import { View } from "react-native";
import { BarChart, ChartCard, Columns, InfoCard, MetricCard, QueryView, Screen, SectionHeader } from "@/components";
import { HomeHero } from "@/features/dashboard/components/HomeHero";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { InvoiceHighlightCard } from "@/features/invoices/components/InvoiceHighlightCard";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { hrefForAction, routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import { formatCompetencia, formatCompetenciaLong, formatCompetenciaShort, formatCurrency, formatKwh } from "@/utils/format";

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dashboard = useDashboard();
  const refresh = useRefreshControl(dashboard);

  return (
    <Screen edges={["top"]} {...refresh}>
      <QueryView
        query={dashboard}
        loading="dashboard"
        isEmpty={(summary) => summary.unitsCount === 0}
        empty={{
          icon: Building,
          title: "Cadastre sua primeira unidade",
          message: "Envie uma foto da sua conta de luz e comece a economizar com energia limpa, sem obras.",
          action: { label: "Cadastrar unidade", onPress: () => router.push(routes.newResidence) }
        }}
      >
        {(summary) => (
          <View style={{ gap: theme.spacing.lg }}>
            <HomeHero summary={summary} />

            {summary.alerts.map((alert) => (
              <InfoCard
                key={alert.id}
                tone={alert.tone}
                title={alert.title}
                message={alert.message}
                {...(alert.action && alert.actionLabel ? { actionLabel: alert.actionLabel, onAction: () => alert.action && router.push(hrefForAction(alert.action)) } : {})}
              />
            ))}

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="Próxima fatura" actionLabel="Ver todas" onAction={() => router.push(routes.invoices)} />
              {summary.nextInvoice ? (
                <InvoiceHighlightCard invoice={summary.nextInvoice} />
              ) : (
                <InfoCard tone="success" title="Tudo em dia" message="Você não tem faturas em aberto." />
              )}
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="Sua energia" subtitle={summary.energy.competencia ? `Referência ${formatCompetencia(summary.energy.competencia)}` : undefined} />
              <Columns>
                <MetricCard label="Energia compensada" value={formatKwh(summary.energy.compensatedKwhMonth)} icon={Leaf} compact />
                <MetricCard label="Consumo" value={formatKwh(summary.energy.consumptionKwhMonth)} icon={Zap} compact />
              </Columns>
              {summary.energy.creditBalanceKwh !== null ? (
                <MetricCard label="Saldo de créditos" value={formatKwh(summary.energy.creditBalanceKwh)} caption="Créditos acumulados para os próximos meses" icon={Gauge} compact />
              ) : null}
            </View>

            {summary.savings.series.length > 0 ? (
              <ChartCard title="Economia mensal" subtitle="Últimos 6 meses · toque e arraste para ver cada mês">
                <BarChart
                  points={summary.savings.series.map((month) => ({
                    label: formatCompetenciaShort(month.competencia),
                    longLabel: formatCompetenciaLong(month.competencia),
                    value: month.value
                  }))}
                  formatValue={formatCurrency}
                  primaryLabel="Economia"
                  accessibilityLabel="Gráfico de economia mensal dos últimos 6 meses"
                />
              </ChartCard>
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="Acesso rápido" />
              <QuickActions />
            </View>
          </View>
        )}
      </QueryView>
    </Screen>
  );
}
