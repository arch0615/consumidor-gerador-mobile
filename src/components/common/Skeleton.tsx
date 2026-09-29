import { useEffect, type ReactNode } from "react";
import { AccessibilityInfo, type DimensionValue, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useTheme, type Theme } from "@/theme";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: keyof Theme["radius"];
}

/** Shimmering placeholder block; animation disabled with Reduce Motion. */
export function Skeleton({ width = "100%", height = 16, radius = "sm" }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (active && !reduced) {
        opacity.value = withRepeat(withTiming(0.45, { duration: 800 }), -1, true);
      }
    });
    return () => {
      active = false;
      cancelAnimation(opacity);
    };
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: theme.radius[radius], backgroundColor: theme.colors.skeleton }, style]}
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export function SkeletonGroup({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View accessible accessibilityLabel="Carregando" accessibilityRole="progressbar" style={{ gap: theme.spacing.sm }}>
      {children}
    </View>
  );
}
