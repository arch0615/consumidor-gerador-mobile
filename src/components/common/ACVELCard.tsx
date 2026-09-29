import type { PropsWithChildren } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme, type SpacingToken } from "@/theme";

export type CardVariant = "default" | "muted" | "hero" | "outlined";

export interface ACVELCardProps extends PropsWithChildren {
  variant?: CardVariant;
  padding?: SpacingToken;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Flat bordered surface (ACVEL web look). When `onPress` is set, the whole
 * card is a single accessible button with pressed feedback — web cards were
 * often not tappable.
 */
export function ACVELCard({ variant = "default", padding = "md", onPress, accessibilityLabel, accessibilityHint, style, children }: ACVELCardProps) {
  const theme = useTheme();
  const { colors } = theme;
  const background =
    variant === "hero" ? colors.heroBackground : variant === "muted" ? colors.surfaceMuted : colors.surface;
  const borderColor = variant === "hero" ? colors.heroBackground : variant === "outlined" ? colors.borderStrong : colors.border;
  const base: ViewStyle = {
    backgroundColor: background,
    borderColor,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[padding],
    overflow: "hidden"
  };

  if (!onPress) {
    return <View style={[base, style]}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [base, pressed ? { opacity: 0.85, transform: [{ scale: 0.99 }] } : null, style]}
    >
      {children}
    </Pressable>
  );
}
