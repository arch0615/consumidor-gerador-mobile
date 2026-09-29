import type { ReactNode, Ref } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets, type Edge } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { OfflineBanner } from "../states/OfflineBanner";

export interface ScreenProps {
  children: ReactNode;
  /** Pull-to-refresh handler (every data screen should pass one). */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Sticky bottom action area (above the home indicator / keyboard). */
  footer?: ReactNode;
  scroll?: boolean;
  /** Top safe-area edge is usually handled by the navigation header. */
  edges?: readonly Edge[];
  padded?: boolean;
  keyboardAware?: boolean;
  scrollRef?: Ref<ScrollView>;
  contentGap?: number;
  onScroll?: ScrollViewProps["onScroll"];
  testID?: string;
}

/**
 * Standard screen container: canvas background, 16pt gutters, safe areas,
 * pull-to-refresh, offline banner, keyboard avoidance and a sticky footer.
 */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  footer,
  scroll = true,
  edges = ["bottom"],
  padded = true,
  keyboardAware = false,
  scrollRef,
  contentGap,
  onScroll,
  testID
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const gap = contentGap ?? theme.spacing.lg;
  const paddingTop = edges.includes("top") ? insets.top + theme.spacing.md : theme.spacing.md;
  const bottomInset = edges.includes("bottom") && !footer ? insets.bottom : 0;
  const contentStyle = {
    paddingHorizontal: padded ? theme.spacing.md : 0,
    paddingTop,
    paddingBottom: bottomInset + theme.spacing.xl,
    gap
  };

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      testID={testID}
      style={{ flex: 1 }}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View testID={testID} style={[{ flex: 1 }, contentStyle]}>
      {children}
    </View>
  );

  const content = (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <OfflineBanner />
      {body}
      {footer ? (
        <View
          style={[
            {
              paddingHorizontal: theme.spacing.md,
              paddingTop: theme.spacing.sm,
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
              backgroundColor: theme.colors.surface,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              gap: theme.spacing.xs
            },
            theme.shadows.level1
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );

  if (!keyboardAware) return content;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}>
      {content}
    </KeyboardAvoidingView>
  );
}
