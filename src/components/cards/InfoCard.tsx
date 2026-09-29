import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "@/theme";
import type { StatusTone } from "@/utils/status-labels";
import { ACVELButton } from "../common/ACVELButton";
import { AppText } from "../common/AppText";

export interface InfoCardProps {
  title: string;
  message?: string;
  tone?: StatusTone;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

const DEFAULT_ICON: Record<StatusTone, LucideIcon> = {
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  info: Info,
  neutral: Info
};

/** Tinted banner for pending actions, notices and warnings. */
export function InfoCard({ title, message, tone = "info", icon, actionLabel, onAction }: InfoCardProps) {
  const theme = useTheme();
  const colors = theme.colors[tone];
  const Icon = icon ?? DEFAULT_ICON[tone];
  return (
    <View
      accessibilityRole={tone === "danger" || tone === "warning" ? "alert" : undefined}
      style={{
        flexDirection: "row",
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg
      }}
    >
      <Icon size={theme.sizing.iconMd} color={colors.fg} />
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <AppText variant="subheadStrong" style={{ color: colors.fg }}>
          {title}
        </AppText>
        {message ? (
          <AppText variant="footnote" style={{ color: colors.fg }}>
            {message}
          </AppText>
        ) : null}
        {actionLabel && onAction ? (
          <ACVELButton label={actionLabel} variant="secondary" size="sm" fullWidth={false} onPress={onAction} />
        ) : null}
      </View>
    </View>
  );
}
