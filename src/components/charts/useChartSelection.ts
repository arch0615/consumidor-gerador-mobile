import * as Haptics from "expo-haptics";
import { useCallback, useRef, useState } from "react";
import type { AccessibilityActionEvent, GestureResponderEvent, LayoutChangeEvent, ViewProps } from "react-native";

export interface ChartPoint {
  label: string;
  /** Full label for screen readers / tooltip ("Setembro de 2026"). */
  longLabel?: string;
  value: number;
  /** Optional comparison series (e.g. consumo vs. compensado). */
  secondary?: number;
}

/**
 * Touch scrubbing + screen-reader stepping shared by the charts. Drag across
 * the plot to select a point (selection haptic on change); VoiceOver /
 * TalkBack users swipe up/down on the adjustable element.
 */
export function useChartSelection(points: readonly ChartPoint[], describe: (point: ChartPoint) => string) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(points.length - 1);
  const lastIndex = useRef(selected);
  const clampedSelected = Math.min(Math.max(selected, 0), points.length - 1);

  const select = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(index, 0), points.length - 1);
      if (next !== lastIndex.current) {
        lastIndex.current = next;
        void Haptics.selectionAsync();
      }
      setSelected(next);
    },
    [points.length]
  );

  const indexAt = useCallback(
    (x: number) => (points.length <= 1 || width === 0 ? 0 : Math.round((x / width) * (points.length - 1))),
    [points.length, width]
  );

  const onTouch = (event: GestureResponderEvent) => select(indexAt(event.nativeEvent.locationX));

  const point = points[clampedSelected];
  const plotProps: ViewProps = {
    onLayout: (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width),
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    // Keep the gesture while scrubbing horizontally inside a vertical ScrollView.
    onResponderTerminationRequest: () => false,
    onResponderGrant: onTouch,
    onResponderMove: onTouch,
    accessible: true,
    accessibilityRole: "adjustable",
    accessibilityValue: point ? { text: describe(point) } : undefined,
    accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === "increment") select(clampedSelected + 1);
      if (event.nativeEvent.actionName === "decrement") select(clampedSelected - 1);
    }
  };

  return { width, selectedIndex: clampedSelected, selectedPoint: point, plotProps };
}

/** "Nice" upper bound so gridlines land on round numbers. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Shows at most `max` evenly spaced x-axis labels. */
export function labelStride(count: number, max = 6): number {
  return Math.max(1, Math.ceil(count / max));
}
