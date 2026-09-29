import { View } from "react-native";
import { useTheme } from "@/theme";
import { AppText } from "../common/AppText";
import type { ChartPoint } from "./useChartSelection";

export interface ChartTooltipProps {
  point: ChartPoint | undefined;
  formatValue: (value: number) => string;
  secondaryLabel?: string;
  primaryLabel?: string;
}

/** Fixed readout above the plot (never overlaps the finger). */
export function ChartTooltip({ point, formatValue, primaryLabel, secondaryLabel }: ChartTooltipProps) {
  const theme = useTheme();
  if (!point) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: theme.spacing.sm }} importantForAccessibility="no-hide-descendants">
      <View>
        <AppText variant="caption" tone="secondary">
          {point.longLabel ?? point.label}
          {primaryLabel ? ` · ${primaryLabel}` : ""}
        </AppText>
        <AppText variant="title3">{formatValue(point.value)}</AppText>
      </View>
      {point.secondary !== undefined && secondaryLabel ? (
        <View style={{ alignItems: "flex-end" }}>
          <AppText variant="caption" tone="secondary">
            {secondaryLabel}
          </AppText>
          <AppText variant="subheadStrong" tone="secondary">
            {formatValue(point.secondary)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
