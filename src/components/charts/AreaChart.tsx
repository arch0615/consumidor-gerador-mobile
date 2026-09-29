import { View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "@/theme";
import { AppText } from "../common/AppText";
import { ChartTooltip } from "./ChartTooltip";
import { labelStride, niceMax, useChartSelection, type ChartPoint } from "./useChartSelection";

export interface AreaChartProps {
  points: readonly ChartPoint[];
  formatValue: (value: number) => string;
  height?: number;
  /** Accessible chart summary, e.g. "Economia mensal nos últimos 12 meses". */
  accessibilityLabel: string;
}

const PAD_TOP = 12;
const PAD_BOTTOM = 4;

/** Single-series area chart with touch scrubbing (vertical, phone-friendly). */
export function AreaChart({ points, formatValue, height = 180, accessibilityLabel }: AreaChartProps) {
  const theme = useTheme();
  const color = theme.colors.chart[0];
  const describe = (point: ChartPoint) => `${point.longLabel ?? point.label}: ${formatValue(point.value)}`;
  const { width, selectedIndex, selectedPoint, plotProps } = useChartSelection(points, describe);

  const max = niceMax(Math.max(...points.map((point) => point.value), 0));
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const x = (index: number) => (points.length <= 1 ? width / 2 : (index / (points.length - 1)) * width);
  const y = (value: number) => PAD_TOP + plotHeight - (value / max) * plotHeight;

  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const area = points.length > 0 ? `${line} L${x(points.length - 1).toFixed(1)},${PAD_TOP + plotHeight} L${x(0).toFixed(1)},${PAD_TOP + plotHeight} Z` : "";
  const stride = labelStride(points.length);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <ChartTooltip point={selectedPoint} formatValue={formatValue} />
      <View {...plotProps} accessibilityLabel={accessibilityLabel} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={color} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {[0, 0.5, 1].map((ratio) => (
              <Line
                key={ratio}
                x1={0}
                x2={width}
                y1={PAD_TOP + plotHeight * ratio}
                y2={PAD_TOP + plotHeight * ratio}
                stroke={theme.colors.chartGrid}
                strokeWidth={1}
                strokeDasharray={ratio === 1 ? undefined : "4 4"}
              />
            ))}
            <Path d={area} fill="url(#areaFill)" />
            <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {selectedPoint ? (
              <>
                <Line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={PAD_TOP} y2={PAD_TOP + plotHeight} stroke={theme.colors.borderStrong} strokeWidth={1} />
                <Circle cx={x(selectedIndex)} cy={y(selectedPoint.value)} r={6} fill={theme.colors.surface} stroke={color} strokeWidth={3} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }} importantForAccessibility="no-hide-descendants">
        {points.map((point, index) =>
          index % stride === 0 || index === points.length - 1 ? (
            <AppText key={`${point.label}-${index}`} variant="caption" tone={index === selectedIndex ? "brand" : "tertiary"}>
              {point.label}
            </AppText>
          ) : null
        )}
      </View>
    </View>
  );
}
