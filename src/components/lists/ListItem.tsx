import { ChevronRight, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useTheme, type Theme } from "@/theme";
import { AppText } from "../common/AppText";

export type ListItemIconTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  caption?: string;
  icon?: LucideIcon;
  iconTone?: ListItemIconTone;
  /** Right-aligned value (amount, kWh, points). */
  value?: string;
  valueTone?: "primary" | "success" | "danger";
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  unread?: boolean;
  accessibilityHint?: string;
  /** Overrides the composed label (when `trailing` carries information). */
  accessibilityLabel?: string;
  divider?: boolean;
}

function iconColors(theme: Theme, tone: ListItemIconTone): { bg: string; fg: string } {
  if (tone === "brand") return { bg: theme.colors.primarySoft, fg: theme.colors.primary };
  return { bg: theme.colors[tone].bg, fg: theme.colors[tone].fg };
}

/**
 * Row used for lists and settings. Replaces the web's wide tables: at most a
 * title, two supporting lines and one trailing value per row.
 */
export function ListItem({
  title,
  subtitle,
  caption,
  icon: Icon,
  iconTone = "brand",
  value,
  valueTone = "primary",
  trailing,
  onPress,
  showChevron,
  destructive = false,
  unread = false,
  accessibilityHint,
  accessibilityLabel,
  divider = false
}: ListItemProps) {
  const theme = useTheme();
  const colors = iconColors(theme, destructive ? "danger" : iconTone);
  const chevron = showChevron ?? Boolean(onPress);
  const a11yLabel = accessibilityLabel ?? [unread ? "Não lida" : null, title, subtitle, caption, value].filter(Boolean).join(", ");

  const content = (
    <View
      style={{
        minHeight: subtitle || caption ? theme.sizing.listRowTwoLine : theme.sizing.listRow,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: theme.colors.border
      }}
    >
      {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary }} /> : null}
      {Icon ? (
        <View style={{ width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
          <Icon size={theme.sizing.iconMd} color={colors.fg} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant={unread ? "bodyStrong" : "body"} tone={destructive ? "danger" : "primary"} numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="secondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
        {caption ? (
          <AppText variant="caption" tone="tertiary" numberOfLines={1}>
            {caption}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="bodyStrong" tone={valueTone} numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      {trailing}
      {chevron ? <ChevronRight size={theme.sizing.iconMd} color={theme.colors.textTertiary} /> : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={a11yLabel}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? theme.colors.surfaceMuted : "transparent", borderRadius: theme.radius.md })}
    >
      {content}
    </Pressable>
  );
}
