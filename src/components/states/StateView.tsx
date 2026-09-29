import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { useTheme, type Theme } from "@/theme";
import { ACVELButton } from "../common/ACVELButton";
import { AppText } from "../common/AppText";

export type StateTone = "neutral" | "danger" | "warning" | "brand";

export interface StateAction {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
}

export interface StateViewProps {
  icon: LucideIcon;
  title: string;
  message: string;
  tone?: StateTone;
  primaryAction?: StateAction | undefined;
  secondaryAction?: StateAction | undefined;
}

function toneColors(theme: Theme, tone: StateTone): { bg: string; fg: string } {
  switch (tone) {
    case "danger":
      return { bg: theme.colors.danger.bg, fg: theme.colors.danger.fg };
    case "warning":
      return { bg: theme.colors.warning.bg, fg: theme.colors.warning.fg };
    case "brand":
      return { bg: theme.colors.primarySoft, fg: theme.colors.primary };
    case "neutral":
      return { bg: theme.colors.surfaceMuted, fg: theme.colors.textSecondary };
  }
}

/**
 * Shared layout for empty / error / offline / forbidden states. Always
 * rendered inside the screen (header stays) and always offers a next step —
 * web states had no actions and replaced the whole page.
 */
export function StateView({ icon: Icon, title, message, tone = "neutral", primaryAction, secondaryAction }: StateViewProps) {
  const theme = useTheme();
  const colors = toneColors(theme, tone);
  return (
    <View style={{ alignItems: "center", paddingVertical: theme.spacing.xl, paddingHorizontal: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Icon size={theme.sizing.iconXl} color={colors.fg} />
      </View>
      <View style={{ gap: theme.spacing.xs, alignItems: "center" }}>
        <AppText variant="title3" align="center" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="subhead" tone="secondary" align="center">
          {message}
        </AppText>
      </View>
      {primaryAction || secondaryAction ? (
        <View style={{ alignSelf: "stretch", gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
          {primaryAction ? <ACVELButton label={primaryAction.label} {...(primaryAction.icon ? { icon: primaryAction.icon } : {})} onPress={primaryAction.onPress} /> : null}
          {secondaryAction ? (
            <ACVELButton label={secondaryAction.label} variant="tertiary" {...(secondaryAction.icon ? { icon: secondaryAction.icon } : {})} onPress={secondaryAction.onPress} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
