import { Check } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";

export interface ACVELCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Plain label, or rich content (e.g. text with links) via `children`. */
  label?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
  error?: string | undefined;
}

/** 24pt box inside a full-width 48pt touch row. */
export function ACVELCheckbox({ checked, onChange, label, children, accessibilityLabel, error }: ACVELCheckboxProps) {
  const theme = useTheme();
  const boxColor = error ? theme.colors.danger.fg : checked ? theme.colors.primary : theme.colors.borderStrong;
  return (
    <View style={{ gap: theme.spacing.xxs }}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          onChange(!checked);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={accessibilityLabel ?? label}
        style={{ minHeight: theme.sizing.touchTarget, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: boxColor,
            backgroundColor: checked ? theme.colors.primary : "transparent",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {checked ? <Check size={theme.sizing.iconSm} color={theme.colors.textOnPrimary} strokeWidth={3} /> : null}
        </View>
        <View style={{ flex: 1 }}>{children ?? <AppText variant="subhead">{label}</AppText>}</View>
      </Pressable>
      {error ? (
        <AppText variant="footnote" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
