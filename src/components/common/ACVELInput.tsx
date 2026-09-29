import { Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode, type Ref } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";

const MULTILINE_MIN_HEIGHT = 120;

export interface ACVELInputProps extends Omit<TextInputProps, "style" | "placeholderTextColor"> {
  label: string;
  error?: string | undefined;
  helper?: string | undefined;
  optional?: boolean;
  icon?: LucideIcon;
  /** Renders a show/hide toggle and hides the value by default. */
  password?: boolean;
  trailing?: ReactNode;
  ref?: Ref<TextInput>;
}

/**
 * Text field with a permanently visible label, helper text and inline error.
 * Keyboard type / autofill hints are passed through by callers (see
 * docs/mobile-forms.md §0).
 */
export function ACVELInput({
  label,
  error,
  helper,
  optional = false,
  icon: Icon,
  password = false,
  trailing,
  editable = true,
  onFocus,
  onBlur,
  ref,
  ...rest
}: ACVELInputProps) {
  const theme = useTheme();
  const { colors } = theme;
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const borderColor = error ? colors.danger.fg : focused ? colors.focusRing : colors.border;

  return (
    <View style={{ gap: theme.spacing.xxs }}>
      <AppText variant="subheadStrong" tone="primary" nativeID={`${label}-label`}>
        {label}
        {optional ? <AppText variant="subhead" tone="tertiary"> (opcional)</AppText> : null}
      </AppText>
      <View
        style={{
          minHeight: theme.sizing.input,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderWidth: focused || error ? 2 : 1,
          borderColor,
          backgroundColor: editable ? colors.surface : colors.surfaceMuted
        }}
      >
        {Icon ? <Icon size={theme.sizing.iconMd} color={colors.textTertiary} /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          accessibilityState={{ disabled: !editable }}
          aria-invalid={Boolean(error)}
          editable={editable}
          secureTextEntry={password && !revealed}
          placeholderTextColor={colors.textTertiary}
          maxFontSizeMultiplier={theme.sizing.maxFontScale}
          selectionColor={colors.primary}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            theme.typography.body,
            { flex: 1, color: colors.textPrimary, paddingVertical: theme.spacing.sm },
            rest.multiline ? { minHeight: MULTILINE_MIN_HEIGHT, textAlignVertical: "top" } : null
          ]}
          {...rest}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Ocultar senha" : "Mostrar senha"}
            hitSlop={12}
            onPress={() => setRevealed((value) => !value)}
          >
            {revealed ? <EyeOff size={theme.sizing.iconMd} color={colors.textSecondary} /> : <Eye size={theme.sizing.iconMd} color={colors.textSecondary} />}
          </Pressable>
        ) : null}
        {trailing}
      </View>
      {error ? (
        <AppText variant="footnote" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="footnote" tone="secondary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}
