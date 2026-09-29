import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { formatPercent } from "@/utils/format";
import { ACVELCard } from "../common/ACVELCard";
import { AppText } from "../common/AppText";

export interface MetricCardProps {
  label: string;
  value: string;
  caption?: string;
  icon?: LucideIcon;
  /** Percent change; `positiveIsGood=false` inverts colours (e.g. consumption). */
  trendPercent?: number | null;
  positiveIsGood?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

/** Single metric tile (KPI). Used in horizontal strips and 2-column grids. */
export function MetricCard({ label, value, caption, icon: Icon, trendPercent, positiveIsGood = true, onPress, compact = false }: MetricCardProps) {
  const theme = useTheme();
  const hasTrend = typeof trendPercent === "number" && Number.isFinite(trendPercent);
  const up = hasTrend && trendPercent > 0;
  const good = hasTrend ? (up ? positiveIsGood : !positiveIsGood) : true;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  const a11y = [label, value, caption, hasTrend ? `${up ? "alta" : "queda"} de ${formatPercent(Math.abs(trendPercent))}` : null]
    .filter(Boolean)
    .join(", ");

  return (
    <ACVELCard
      padding={compact ? "sm" : "md"}
      {...(onPress ? { onPress } : {})}
      accessibilityLabel={a11y}
      style={{ flex: 1, minWidth: compact ? 140 : 150 }}
    >
      <View style={{ gap: theme.spacing.xs }} accessible={!onPress} accessibilityLabel={a11y}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          {Icon ? <Icon size={theme.sizing.iconSm} color={theme.colors.primary} /> : null}
          <AppText variant="overline" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
            {label}
          </AppText>
        </View>
        <AppText variant={compact ? "title3" : "title2"} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
        {hasTrend ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xxs }}>
            <TrendIcon size={theme.sizing.iconSm} color={good ? theme.colors.success.fg : theme.colors.danger.fg} />
            <AppText variant="caption" tone={good ? "success" : "danger"}>
              {formatPercent(Math.abs(trendPercent))}
            </AppText>
            {caption ? (
              <AppText variant="caption" tone="tertiary" numberOfLines={1} style={{ flexShrink: 1 }}>
                {caption}
              </AppText>
            ) : null}
          </View>
        ) : caption ? (
          <AppText variant="caption" tone="tertiary" numberOfLines={2}>
            {caption}
          </AppText>
        ) : null}
      </View>
    </ACVELCard>
  );
}
