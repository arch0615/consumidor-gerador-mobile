import type { ReactNode } from "react";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";

export interface PageHeaderProps {
  title: string;
  subtitle?: string | undefined;
  /** Right-side slot (e.g. an IconButton). */
  trailing?: ReactNode;
}

/** Large in-content title for tab roots (tabs have no native header). */
export function PageHeader({ title, subtitle, trailing }: PageHeaderProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <AppText variant="title1" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="subhead" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
