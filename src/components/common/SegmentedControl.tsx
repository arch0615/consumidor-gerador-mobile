import * as Haptics from "expo-haptics";
import { Pressable, View } from "react-native";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/** 2–4 peer options (Economia · Indicadores, 6 · 12 meses, status filters). */
export function SegmentedControl<T extends string>({ segments, value, onChange, accessibilityLabel }: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: "row",
        padding: theme.spacing.xxs,
        gap: theme.spacing.xxs,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceMuted
      }}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                void Haptics.selectionAsync();
                onChange(segment.value);
              }
            }}
            style={{
              flex: 1,
              minHeight: theme.sizing.buttonSm + 4,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius.sm,
              backgroundColor: active ? theme.colors.surface : "transparent",
              ...(active ? theme.shadows.level1 : theme.shadows.none)
            }}
          >
            <AppText variant={active ? "subheadStrong" : "subhead"} tone={active ? "primary" : "secondary"} numberOfLines={1}>
              {segment.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
