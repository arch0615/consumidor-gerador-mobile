import { useRouter } from "expo-router";
import { Bell, PiggyBank } from "lucide-react-native";
import { View } from "react-native";
import { ACVELCard, AppText, IconButton, StatusChip } from "@/components";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import type { DashboardSummary } from "@/types/domain";
import { formatCurrency, formatPercent } from "@/utils/format";
import { ACCOUNT_STATUS } from "@/utils/status-labels";

function greeting(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Greeting, account status, notifications bell and the savings headline. */
export function HomeHero({ summary }: { summary: DashboardSummary }) {
  const theme = useTheme();
  const router = useRouter();
  const unit = summary.primaryUnit;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText variant="title2" accessibilityRole="header">
            {greeting(new Date().getHours())}
            {summary.greetingName ? `, ${summary.greetingName}` : ""}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, flexWrap: "wrap" }}>
            <StatusChip status={ACCOUNT_STATUS[summary.accountStatus]} size="sm" />
            {unit ? (
              <AppText variant="footnote" tone="secondary" numberOfLines={1}>
                UC {unit.ucNumber} · {unit.utility}
              </AppText>
            ) : null}
          </View>
        </View>
        <IconButton
          icon={Bell}
          badgeCount={summary.unreadNotifications}
          accessibilityLabel={summary.unreadNotifications > 0 ? `Notificações, ${summary.unreadNotifications} não lidas` : "Notificações"}
          onPress={() => router.push(routes.notifications)}
        />
      </View>

      <ACVELCard variant="hero" padding="lg" onPress={() => router.push(routes.economy)} accessibilityLabel={`Economia total ${formatCurrency(summary.savings.totalSavings)}. Neste mês ${formatCurrency(summary.savings.monthlySavings)}`} accessibilityHint="Abre o detalhamento da economia">
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
            <PiggyBank size={theme.sizing.iconMd} color={theme.colors.accent} />
            <AppText variant="subheadStrong" tone="heroMuted">
              Você já economizou
            </AppText>
          </View>
          <AppText variant="display" tone="hero">
            {formatCurrency(summary.savings.totalSavings)}
          </AppText>
          <View style={{ flexDirection: "row", gap: theme.spacing.lg }}>
            <View>
              <AppText variant="caption" tone="heroMuted">
                Neste mês
              </AppText>
              <AppText variant="bodyStrong" tone="hero">
                {formatCurrency(summary.savings.monthlySavings)}
              </AppText>
            </View>
            <View>
              <AppText variant="caption" tone="heroMuted">
                Desconto médio
              </AppText>
              <AppText variant="bodyStrong" tone="hero">
                {formatPercent(summary.savings.averagePercent)}
              </AppText>
            </View>
          </View>
        </View>
      </ACVELCard>
    </View>
  );
}
