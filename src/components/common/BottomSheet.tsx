import { X } from "lucide-react-native";
import { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";

export interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Sticky area under the scrollable content (primary actions). */
  footer?: ReactNode;
  /** Max height as a fraction of the screen. */
  maxHeightRatio?: number;
  scrollable?: boolean;
}

const OFFSCREEN = 800;

/**
 * Animated bottom sheet (scrim fade + slide up) replacing the web's centred
 * overlays, which did not fit or scroll on phones. Keyboard-aware; closes on
 * scrim tap, the close button, and Android back.
 */
export function BottomSheet({ visible, onClose, title, description, footer, maxHeightRatio = 0.9, scrollable = true, children }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(OFFSCREEN);
  const scrimOpacity = useSharedValue(0);

  // Mount immediately when opened (state adjusted during render); unmount after the exit animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: theme.motion.base });
      scrimOpacity.value = withTiming(1, { duration: theme.motion.base });
      return undefined;
    }
    translateY.value = withTiming(OFFSCREEN, { duration: theme.motion.base });
    scrimOpacity.value = withTiming(0, { duration: theme.motion.base });
    const timer = setTimeout(() => setMounted(false), theme.motion.base);
    return () => clearTimeout(timer);
  }, [visible, translateY, scrimOpacity, theme.motion.base]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));

  if (!mounted) return null;

  const Body = scrollable ? ScrollView : View;

  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }, scrimStyle]}>
          <Pressable style={styles.fill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" />
        </Animated.View>
        <View style={styles.anchor} pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            style={[
              {
                maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                paddingBottom: Math.max(insets.bottom, theme.spacing.md)
              },
              theme.shadows.level2,
              sheetStyle
            ]}
          >
            <View style={{ alignItems: "center", paddingTop: theme.spacing.xs }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderStrong }} />
            </View>
            <View style={[styles.header, { paddingLeft: theme.spacing.md, paddingRight: theme.spacing.xxs, gap: theme.spacing.xs }]}>
              <View style={{ flex: 1, paddingTop: theme.spacing.sm }}>
                <AppText variant="title3" accessibilityRole="header">
                  {title}
                </AppText>
                {description ? (
                  <AppText variant="subhead" tone="secondary" style={{ marginTop: theme.spacing.xxs }}>
                    {description}
                  </AppText>
                ) : null}
              </View>
              <IconButton icon={X} accessibilityLabel="Fechar" onPress={onClose} />
            </View>
            <Body
              {...(scrollable ? { keyboardShouldPersistTaps: "handled" as const, contentContainerStyle: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md, gap: theme.spacing.sm } } : { style: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md, gap: theme.spacing.sm } })}
            >
              {children}
            </Body>
            {footer ? <View style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.xs }}>{footer}</View> : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  anchor: { flex: 1, justifyContent: "flex-end" },
  header: { flexDirection: "row", alignItems: "flex-start" }
});
