import { Text, type TextProps, type TextStyle } from "react-native";
import { useTheme, type Theme, type TypographyVariant } from "@/theme";

export type TextTone =
  | "primary"
  | "secondary"
  | "tertiary"
  | "brand"
  | "onPrimary"
  | "hero"
  | "heroMuted"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: TextStyle["textAlign"];
}

function toneColor(theme: Theme, tone: TextTone): string {
  const { colors } = theme;
  switch (tone) {
    case "primary":
      return colors.textPrimary;
    case "secondary":
      return colors.textSecondary;
    case "tertiary":
      return colors.textTertiary;
    case "brand":
      return colors.primary;
    case "onPrimary":
      return colors.textOnPrimary;
    case "hero":
      return colors.heroText;
    case "heroMuted":
      return colors.heroTextMuted;
    case "success":
      return colors.success.fg;
    case "warning":
      return colors.warning.fg;
    case "danger":
      return colors.danger.fg;
    case "info":
      return colors.info.fg;
  }
}

/**
 * The only text primitive. Applies the typography scale, theme colour and a
 * font-scale cap (Dynamic Type up to 1.3×) so layouts never break.
 */
export function AppText({ variant = "body", tone = "primary", align, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const token = theme.typography[variant];
  return (
    <Text
      maxFontSizeMultiplier={theme.sizing.maxFontScale}
      {...rest}
      style={[token, { color: toneColor(theme, tone) }, align ? { textAlign: align } : null, style]}
    />
  );
}
