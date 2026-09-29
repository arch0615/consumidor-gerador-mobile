import type { LucideIcon } from "lucide-react-native";
import { Switch, View } from "react-native";
import { useTheme } from "@/theme";
import { AppText } from "../common/AppText";

export interface SwitchListItemProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  divider?: boolean;
}

/** Settings row with a native switch; the whole row is one accessible switch. */
export function SwitchListItem({ title, subtitle, icon: Icon, value, onValueChange, disabled = false, divider = false }: SwitchListItemProps) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="switch"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityState={{ checked: value, disabled }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={() => !disabled && onValueChange(!value)}
      style={{
        minHeight: subtitle ? theme.sizing.listRowTwoLine : theme.sizing.listRow,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: theme.colors.border
      }}
    >
      {Icon ? (
        <View style={{ width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Icon size={theme.sizing.iconMd} color={theme.colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body">{title}</AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
        ios_backgroundColor={theme.colors.borderStrong}
        importantForAccessibility="no"
      />
    </View>
  );
}
