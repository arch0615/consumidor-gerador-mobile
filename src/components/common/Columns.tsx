import { Children, type PropsWithChildren } from "react";
import { View } from "react-native";
import { useTheme, type SpacingToken } from "@/theme";

/** Equal-width columns (e.g. 2 MetricCards side by side). Children are laid out in one row. */
export function Columns({ gap = "sm", children }: PropsWithChildren<{ gap?: SpacingToken }>) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: theme.spacing[gap] }}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={{ flex: 1 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
