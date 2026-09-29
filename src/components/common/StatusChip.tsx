import { View } from "react-native";
import { useTheme } from "@/theme";
import type { StatusPresentation, StatusTone } from "@/utils/status-labels";
import { AppText } from "./AppText";

export interface StatusChipProps {
  /** Prefer passing a presentation from `utils/status-labels` — never a raw enum. */
  status?: StatusPresentation;
  label?: string;
  tone?: StatusTone;
  size?: "sm" | "md";
}

export function StatusChip({ status, label, tone, size = "md" }: StatusChipProps) {
  const theme = useTheme();
  const resolvedTone: StatusTone = status?.tone ?? tone ?? "neutral";
  const text = status?.label ?? label ?? "";
  const colors = theme.colors[resolvedTone];
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Status: ${text}`}
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xxs,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: theme.radius.full,
        paddingHorizontal: size === "sm" ? theme.spacing.xs : theme.spacing.sm,
        paddingVertical: size === "sm" ? 2 : theme.spacing.xxs
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.fg }} />
      <AppText variant="caption" style={{ color: colors.fg }} numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}
