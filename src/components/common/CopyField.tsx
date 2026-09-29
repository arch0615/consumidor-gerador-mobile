import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Check, Copy } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { useTheme } from "@/theme";
import { ACVELButton } from "./ACVELButton";
import { AppText } from "./AppText";

export interface CopyFieldProps {
  label: string;
  value: string;
  /** What is shown (e.g. grouped digitable line); defaults to value. */
  displayValue?: string;
  copyLabel: string;
  copiedMessage: string;
  primary?: boolean;
  numberOfLines?: number;
}

/**
 * Value + copy action with clipboard, success haptic, label feedback and a
 * screen-reader announcement (PIX copia-e-cola, boleto line, referral link).
 */
export function CopyField({ label, value, displayValue, copyLabel, copiedMessage, primary = false, numberOfLines = 3 }: CopyFieldProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    await Clipboard.setStringAsync(value);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility(copiedMessage);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="overline" tone="secondary">
        {label}
      </AppText>
      <View
        style={{
          padding: theme.spacing.sm,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceMuted
        }}
      >
        <AppText variant="footnote" selectable numberOfLines={numberOfLines} accessibilityLabel={`${label}: ${displayValue ?? value}`}>
          {displayValue ?? value}
        </AppText>
      </View>
      <ACVELButton
        label={copied ? "Copiado!" : copyLabel}
        icon={copied ? Check : Copy}
        variant={primary ? "primary" : "secondary"}
        size={primary ? "lg" : "md"}
        onPress={() => void copy()}
      />
    </View>
  );
}
