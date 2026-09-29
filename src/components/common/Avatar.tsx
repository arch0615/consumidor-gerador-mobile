import { View } from "react-native";
import { useTheme } from "@/theme";
import { initials } from "@/utils/format";
import { AppText } from "./AppText";

export interface AvatarProps {
  name: string;
  size?: "sm" | "lg";
}

export function Avatar({ name, size = "sm" }: AvatarProps) {
  const theme = useTheme();
  const dimension = size === "lg" ? theme.sizing.avatarLg : theme.sizing.avatarSm;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        backgroundColor: theme.colors.primarySoft,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <AppText variant={size === "lg" ? "title2" : "caption"} tone="brand" maxFontSizeMultiplier={1}>
        {initials(name)}
      </AppText>
    </View>
  );
}
