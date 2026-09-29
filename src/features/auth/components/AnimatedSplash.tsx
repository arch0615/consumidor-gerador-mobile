import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { BrandLogo } from "@/components/common/BrandLogo";
import { palette } from "@/theme";

const HOLD_MS = 650;
const FADE_MS = 350;

/**
 * Branded launch transition shown on top of the first screen right after the
 * native splash hides (same navy background → seamless). Skipped entirely
 * when Reduce Motion is on.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const logoScale = useSharedValue(0.92);
  const logoOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      onFinish();
      return;
    }
    logoOpacity.value = withTiming(1, { duration: 300 });
    logoScale.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
    overlayOpacity.value = withDelay(
      HOLD_MS,
      withTiming(0, { duration: FADE_MS }, (finished) => {
        if (finished) scheduleOnRN(onFinish);
      })
    );
  }, [reduceMotion, onFinish, logoOpacity, logoScale, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ scale: logoScale.value }] }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]} importantForAccessibility="no-hide-descendants">
      <Animated.View style={logoStyle}>
        <BrandLogo width={220} on="dark" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Matches the native splash backgroundColor in app.json.
  overlay: { backgroundColor: palette.acvelNavy, alignItems: "center", justifyContent: "center" }
});
