import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useTheme, type Theme } from "@/theme";
import { AppText } from "./AppText";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive" | "inverse";
export type ButtonSize = "lg" | "md" | "sm";

export interface ACVELButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface VariantColors {
  background: string;
  pressed: string;
  border: string;
  text: string;
}

function variantColors(theme: Theme, variant: ButtonVariant): VariantColors {
  const { colors } = theme;
  switch (variant) {
    case "primary":
      return { background: colors.primary, pressed: colors.primaryPressed, border: colors.primary, text: colors.textOnPrimary };
    case "secondary":
      return { background: colors.surface, pressed: colors.surfaceMuted, border: colors.borderStrong, text: colors.textPrimary };
    case "tertiary":
      return { background: "transparent", pressed: colors.primarySoft, border: "transparent", text: colors.primary };
    case "destructive":
      return { background: colors.danger.fg, pressed: colors.danger.border, border: colors.danger.fg, text: colors.surface };
    case "inverse":
      return { background: colors.heroText, pressed: colors.heroTextMuted, border: colors.heroText, text: colors.heroBackground };
  }
}

const HEIGHT: Record<ButtonSize, keyof Theme["sizing"]> = { lg: "buttonLg", md: "buttonMd", sm: "buttonSm" };

export function ACVELButton({
  label,
  variant = "primary",
  size = "lg",
  icon: Icon,
  iconPosition = "left",
  loading = false,
  loadingLabel,
  fullWidth = true,
  haptic = false,
  disabled,
  onPress,
  style,
  accessibilityLabel,
  ...rest
}: ACVELButtonProps) {
  const theme = useTheme();
  const palette = variantColors(theme, variant);
  const isDisabled = Boolean(disabled) || loading;
  const height = theme.sizing[HEIGHT[size]];
  const iconSize = size === "sm" ? theme.sizing.iconSm : theme.sizing.iconMd;
  const text = loading && loadingLabel ? loadingLabel : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={size === "sm" ? 6 : 0}
      onPress={(event) => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          paddingHorizontal: size === "sm" ? theme.spacing.sm : theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? palette.pressed : palette.background,
          borderColor: palette.border,
          opacity: isDisabled ? 0.45 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          transform: [{ scale: pressed ? 0.98 : 1 }]
        },
        style
      ]}
      {...rest}
    >
      <View style={[styles.content, { gap: theme.spacing.xs }]}>
        {loading ? <ActivityIndicator size="small" color={palette.text} /> : null}
        {!loading && Icon && iconPosition === "left" ? <Icon size={iconSize} color={palette.text} strokeWidth={2} /> : null}
        <AppText variant={size === "sm" ? "subheadStrong" : "callout"} style={{ color: palette.text }} numberOfLines={1}>
          {text}
        </AppText>
        {!loading && Icon && iconPosition === "right" ? <Icon size={iconSize} color={palette.text} strokeWidth={2} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, justifyContent: "center" },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center" }
});
