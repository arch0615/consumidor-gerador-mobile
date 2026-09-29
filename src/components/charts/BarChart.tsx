import { View } from "react-native";
import Svg, { G, Line, Rect } from "react-native-svg";
import { useTheme } from "@/theme";
import { AppText } from "../common/AppText";
import { ChartTooltip } from "./ChartTooltip";
import { labelStride, niceMax, useChartSelection, type ChartPoint } from "./useChartSelection";

export interface BarChartProps {
  points: readonly ChartPoint[];
  formatValue: (value: number) => string;
  primaryLabel: string;
  /** Label of the comparison series; enables paired bars. */
  secondaryLabel?: string;
  height?: number;
  accessibilityLabel: string;
}

const PAD_TOP = 8;

/** Vertical (optionally paired) bars with touch selection. */
export function BarChart({ points, formatValue, primaryLabel, secondaryLabel, height = 180, accessibilityLabel }: BarChartProps) {
  const theme = useTheme();
  const [primaryColor, secondaryColor] = theme.colors.chart;
  const paired = secondaryLabel !== undefined;
  const describe = (point: ChartPoint) =>
    `${point.longLabel ?? point.label}: ${primaryLabel} ${formatValue(point.value)}${paired && point.secondary !== undefined ? `, ${secondaryLabel} ${formatValue(point.secondary)}` : ""}`;
  const { width, selectedIndex, selectedPoint, plotProps } = useChartSelection(points, describe);

  const max = niceMax(Math.max(...points.flatMap((point) => [point.value, point.secondary ?? 0]), 0));
  const plotHeight = height - PAD_TOP;
  const slot = points.length > 0 ? width / points.length : 0;
  const barWidth = Math.min(paired ? slot * 0.34 : slot * 0.56, 28);
  const barHeight = (value: number) => Math.max((value / max) * plotHeight, value > 0 ? 2 : 0);
  const stride = labelStride(points.length);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <ChartTooltip point={selectedPoint} formatValue={formatValue} primaryLabel={primaryLabel} {...(secondaryLabel ? { secondaryLabel } : {})} />
      <View {...plotProps} accessibilityLabel={accessibilityLabel} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} stroke={theme.colors.chartGrid} strokeWidth={1} />
            {points.map((point, index) => {
              const center = slot * index + slot / 2;
              const opacity = index === selectedIndex ? 1 : 0.45;
              const primaryX = paired ? center - barWidth - 1 : center - barWidth / 2;
              return (
                <G key={`${point.label}-${index}`}>
                  <Rect x={primaryX} y={height - barHeight(point.value)} width={barWidth} height={barHeight(point.value)} rx={4} fill={primaryColor} opacity={opacity} />
                  {paired && point.secondary !== undefined ? (
                    <Rect x={center + 1} y={height - barHeight(point.secondary)} width={barWidth} height={barHeight(point.secondary)} rx={4} fill={secondaryColor} opacity={opacity} />
                  ) : null}
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: "row" }} importantForAccessibility="no-hide-descendants">
        {points.map((point, index) => (
          <AppText key={`${point.label}-${index}`} variant="caption" tone={index === selectedIndex ? "brand" : "tertiary"} align="center" style={{ flex: 1 }}>
            {index % stride === 0 || index === points.length - 1 ? point.label : ""}
          </AppText>
        ))}
      </View>
      {paired ? (
        <View style={{ flexDirection: "row", gap: theme.spacing.md }} importantForAccessibility="no-hide-descendants">
          <Legend color={primaryColor} label={primaryLabel} />
          <Legend color={secondaryColor} label={secondaryLabel} />
        </View>
      ) : null}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xxs }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}
