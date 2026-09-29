import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: theme.spacing.sm }}>
      <View style={{ flex: 1 }}>
        <AppText variant="title3" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${actionLabel}: ${title}`}
          onPress={onAction}
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center", minHeight: theme.sizing.buttonSm }}
        >
          <AppText variant="subheadStrong" tone="brand">
            {actionLabel}
          </AppText>
          <ChevronRight size={theme.sizing.iconSm} color={theme.colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}
