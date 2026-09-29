import { useRouter } from "expo-router";
import { CalendarDays, Gauge, Leaf, PiggyBank, TrendingDown } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import {
  ACVELCard,
  AppText,
  AreaChart,
  BarChart,
  ChartCard,
  Columns,
  ListItem,
  MetricCard,
  PageHeader,
  QueryView,
  Screen,
  SectionHeader,
  SegmentedControl,
  type Segment
} from "@/components";
import { EconomyMonthSheet } from "@/features/economy/components/EconomyMonthSheet";
import { useEconomy } from "@/features/economy/hooks/useEconomy";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import type { EconomyMonth } from "@/types/domain";
import { formatCompetencia, formatCompetenciaLong, formatCompetenciaShort, formatCurrency, formatKwh, formatPercent } from "@/utils/format";

type ChartView = "savings" | "energy";
type Period = "6" | "12";

const VIEW_SEGMENTS: readonly Segment<ChartView>[] = [
  { value: "savings", label: "Economia" },
  { value: "energy", label: "Consumo" }
];
const PERIOD_SEGMENTS: readonly Segment<Period>[] = [
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" }
];

export default function EconomyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const economy = useEconomy();
  const refresh = useRefreshControl(economy);
  const [view, setView] = useState<ChartView>("savings");
  const [period, setPeriod] = useState<Period>("6");
  const [selectedMonth, setSelectedMonth] = useState<EconomyMonth | null>(null);

  return (
    <Screen edges={["top"]} {...refresh}>
      <PageHeader title="Economia" subtitle="Quanto você deixou de pagar com energia limpa" />
      <QueryView
        query={economy}
        loading="dashboard"
        isEmpty={(overview) => overview.months.length === 0}
        empty={{
          icon: PiggyBank,
          title: "Sua economia aparece aqui",
          message: "Assim que sua unidade começar a compensar energia, mostramos mês a mês quanto você economizou.",
          action: { label: "Ver minhas unidades", onPress: () => router.push(routes.residences) }
        }}
      >
        {(overview) => {
          const months = overview.months.slice(-Number(period));
          const points =
            view === "savings"
              ? months.map((month) => ({ label: formatCompetenciaShort(month.competencia), longLabel: formatCompetenciaLong(month.competencia), value: month.savings }))
              : months.map((month) => ({
                  label: formatCompetenciaShort(month.competencia),
                  longLabel: formatCompetenciaLong(month.competencia),
                  value: month.consumptionKwh,
                  secondary: month.compensatedKwh
                }));
          return (
            <View style={{ gap: theme.spacing.lg }}>
              <ACVELCard variant="hero" padding="lg">
                <View style={{ gap: theme.spacing.xs }}>
                  <AppText variant="subheadStrong" tone="heroMuted">
                    Economia acumulada
                  </AppText>
                  <AppText variant="display" tone="hero">
                    {formatCurrency(overview.totalSavings)}
                  </AppText>
                  <AppText variant="footnote" tone="heroMuted">
                    Desde {formatCompetencia(overview.startedAt)} · desconto médio de {formatPercent(overview.averagePercent)}
                  </AppText>
                </View>
              </ACVELCard>

              <Columns>
                <MetricCard label="Neste mês" value={formatCurrency(overview.currentMonthSavings)} icon={CalendarDays} compact />
                <MetricCard label="kWh compensados" value={formatKwh(overview.compensatedKwhTotal)} icon={Leaf} compact />
              </Columns>

              <ChartCard
                title={view === "savings" ? "Economia por mês" : "Consumo x energia compensada"}
                subtitle="Toque e arraste no gráfico para ver cada mês"
                controls={
                  <View style={{ gap: theme.spacing.xs }}>
                    <SegmentedControl segments={VIEW_SEGMENTS} value={view} onChange={setView} accessibilityLabel="Tipo de gráfico" />
                    <SegmentedControl segments={PERIOD_SEGMENTS} value={period} onChange={setPeriod} accessibilityLabel="Período do gráfico" />
                  </View>
                }
              >
                {view === "savings" ? (
                  <AreaChart key={`savings-${period}`} points={points} formatValue={formatCurrency} accessibilityLabel={`Economia mensal nos últimos ${period} meses`} />
                ) : (
                  <BarChart
                    key={`energy-${period}`}
                    points={points}
                    formatValue={formatKwh}
                    primaryLabel="Consumo"
                    secondaryLabel="Compensada"
                    accessibilityLabel={`Consumo e energia compensada nos últimos ${period} meses`}
                  />
                )}
              </ChartCard>

              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Indicadores" />
                <Columns>
                  <MetricCard
                    label="Consumo médio"
                    value={formatKwh(overview.indicators.averageConsumptionKwh)}
                    icon={Gauge}
                    trendPercent={overview.indicators.consumptionTrendPercent}
                    positiveIsGood={false}
                    caption="vs. últimos 3 meses"
                    compact
                  />
                  <MetricCard label="Redução na conta" value={formatPercent(overview.indicators.reductionPercent12Months)} icon={TrendingDown} caption="últimos 12 meses" compact />
                </Columns>
              </View>

              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Histórico mensal" subtitle="Toque em um mês para ver o comparativo" />
                <ACVELCard padding="xs">
                  {[...overview.months].reverse().map((month, index) => (
                    <ListItem
                      key={month.competencia}
                      title={formatCompetenciaLong(month.competencia)}
                      subtitle={`${formatKwh(month.consumptionKwh)} consumidos`}
                      value={formatCurrency(month.savings)}
                      valueTone={month.savings > 0 ? "success" : "primary"}
                      onPress={() => setSelectedMonth(month)}
                      divider={index < overview.months.length - 1}
                    />
                  ))}
                </ACVELCard>
              </View>

              <EconomyMonthSheet month={selectedMonth} onClose={() => setSelectedMonth(null)} />
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}
