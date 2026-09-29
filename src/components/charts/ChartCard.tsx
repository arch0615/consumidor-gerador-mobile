import type { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { ACVELCard } from "../common/ACVELCard";
import { AppText } from "../common/AppText";

export interface ChartCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  /** Optional control row (e.g. a period SegmentedControl). */
  controls?: ReactNode;
  footer?: ReactNode;
}

/** Card chrome for a chart: title, optional controls, plot, footnote. */
export function ChartCard({ title, subtitle, controls, footer, children }: ChartCardProps) {
  const theme = useTheme();
  return (
    <ACVELCard>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.xxs }}>
          <AppText variant="title3" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="footnote" tone="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {controls}
        {children}
        {footer}
      </View>
    </ACVELCard>
  );
}
