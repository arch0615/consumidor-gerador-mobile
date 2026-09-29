import * as Haptics from "expo-haptics";
import { CircleAlert, TriangleAlert, type LucideIcon } from "lucide-react-native";
import type { PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";
import { ACVELButton } from "./ACVELButton";
import { AppText } from "./AppText";

export interface ACVELModalProps extends PropsWithChildren {
  visible: boolean;
  title: string;
  message?: string;
  tone?: "default" | "destructive";
  icon?: LucideIcon;
  confirmLabel: string;
  cancelLabel?: string;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centred confirmation dialog for short decisions (logout, cancel, delete).
 * Destructive tone uses danger styling and a warning haptic — the web used
 * neutral outline buttons for account deletion.
 */
export function ACVELModal({
  visible,
  title,
  message,
  tone = "default",
  icon,
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmLoading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children
}: ACVELModalProps) {
  const theme = useTheme();
  const destructive = tone === "destructive";
  const Icon = icon ?? (destructive ? TriangleAlert : CircleAlert);
  const iconColors = destructive ? theme.colors.danger : theme.colors.info;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={[styles.center, { backgroundColor: theme.colors.scrim, padding: theme.spacing.lg }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Fechar" accessibilityRole="button" />
        <View
          accessibilityViewIsModal
          style={[
            {
              width: "100%",
              maxWidth: 420,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              gap: theme.spacing.md
            },
            theme.shadows.level2
          ]}
        >
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: iconColors.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon size={theme.sizing.iconLg} color={iconColors.fg} />
          </View>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="title3" accessibilityRole="header">
              {title}
            </AppText>
            {message ? (
              <AppText variant="subhead" tone="secondary">
                {message}
              </AppText>
            ) : null}
          </View>
          {children}
          <View style={{ gap: theme.spacing.xs }}>
            <ACVELButton
              label={confirmLabel}
              variant={destructive ? "destructive" : "primary"}
              loading={confirmLoading}
              disabled={confirmDisabled}
              onPress={() => {
                if (destructive) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                onConfirm();
              }}
            />
            <ACVELButton label={cancelLabel} variant="tertiary" onPress={onCancel} disabled={confirmLoading} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" }
});
