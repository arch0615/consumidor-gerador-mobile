import { View } from "react-native";
import { AppText, BottomSheet, InfoCard, ListItem } from "@/components";
import { useTheme } from "@/theme";
import type { EconomyMonth } from "@/types/domain";
import { formatCompetenciaLong, formatCurrency, formatKwh, formatPercent } from "@/utils/format";

export interface EconomyMonthSheetProps {
  month: EconomyMonth | null;
  onClose: () => void;
}

/** Month breakdown: what you would pay vs. what you paid. */
export function EconomyMonthSheet({ month, onClose }: EconomyMonthSheetProps) {
  const theme = useTheme();
  const percent = month && month.totalWithoutAcvel > 0 ? (month.savings / month.totalWithoutAcvel) * 100 : 0;
  return (
    <BottomSheet visible={month !== null} onClose={onClose} title={month ? formatCompetenciaLong(month.competencia) : ""} description="Comparativo do mês">
      {month ? (
        <View style={{ gap: theme.spacing.md }}>
          <View>
            <ListItem title="Sem a ACVEL você pagaria" value={formatCurrency(month.totalWithoutAcvel)} divider />
            <ListItem title="Conta da distribuidora" value={formatCurrency(month.utilityCost)} divider />
            <ListItem title="Fatura ACVEL" value={formatCurrency(month.acvelCost)} divider />
            <ListItem title="Sua economia" value={formatCurrency(month.savings)} valueTone="success" divider />
            <ListItem title="Consumo" subtitle={`${formatKwh(month.compensatedKwh)} compensados`} value={formatKwh(month.consumptionKwh)} />
          </View>
          {month.savings > 0 ? (
            <InfoCard tone="success" title={`${formatPercent(percent)} de desconto`} message="Economia calculada sobre o valor total que você pagaria à distribuidora." />
          ) : (
            <AppText variant="footnote" tone="secondary">
              Neste mês a unidade ainda não estava compensando energia.
            </AppText>
          )}
        </View>
      ) : null}
    </BottomSheet>
  );
}
