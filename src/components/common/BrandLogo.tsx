import { Image } from "react-native";
import { useTheme } from "@/theme";
import wordmarkOnDark from "../../../assets/brand/acvel-wordmark-on-dark.png";
import wordmarkOnLight from "../../../assets/brand/acvel-wordmark-on-light.png";

/** Source artwork ratio (1646×354). */
const RATIO = 1646 / 354;

export interface BrandLogoProps {
  width?: number;
  /** Force the variant for coloured backgrounds (e.g. the navy splash). */
  on?: "light" | "dark" | "auto";
}

export function BrandLogo({ width = 180, on = "auto" }: BrandLogoProps) {
  const theme = useTheme();
  const background = on === "auto" ? theme.mode : on;
  return (
    <Image
      source={background === "dark" ? wordmarkOnDark : wordmarkOnLight}
      style={{ width, height: width / RATIO }}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="ACVEL — Energia por assinatura"
    />
  );
}
