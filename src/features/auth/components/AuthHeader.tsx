import { View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { BrandLogo } from "@/components/common/BrandLogo";
import { useTheme } from "@/theme";

/** Logo + title block at the top of the auth screens. */
export function AuthHeader({ title, subtitle, showLogo = true }: { title: string; subtitle?: string; showLogo?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md, marginBottom: theme.spacing.xs }}>
      {showLogo ? <BrandLogo width={148} /> : null}
      <View style={{ gap: theme.spacing.xxs }}>
        <AppText variant="title1" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
