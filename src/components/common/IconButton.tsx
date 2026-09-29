import type { LucideIcon } from "lucide-react-native";
import { Pressable, View, type PressableProps } from "react-native";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";

export interface IconButtonProps extends Omit<PressableProps, "children" | "style"> {
  icon: LucideIcon;
  /** Required: icon-only controls must be labelled for screen readers. */
  accessibilityLabel: string;
  badgeCount?: number;
  tone?: "default" | "hero";
}

/** 48×48 touch target around a 24pt icon, with optional numeric badge. */
export function IconButton({ icon: Icon, accessibilityLabel, badgeCount = 0, tone = "default", ...rest }: IconButtonProps) {
  const theme = useTheme();
  const color = tone === "hero" ? theme.colors.heroText : theme.colors.textPrimary;
  const label = badgeCount > 0 ? `${accessibilityLabel}, ${badgeCount} não lidas` : accessibilityLabel;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: theme.sizing.touchTarget,
        height: theme.sizing.touchTarget,
        borderRadius: theme.radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? (tone === "hero" ? theme.colors.heroPressed : theme.colors.surfaceMuted) : "transparent"
      })}
      {...rest}
    >
      <Icon size={theme.sizing.iconLg} color={color} strokeWidth={2} />
      {badgeCount > 0 ? (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 4,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: theme.radius.full,
            backgroundColor: theme.colors.danger.fg,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <AppText variant="caption" style={{ color: theme.colors.surface, fontSize: 11, lineHeight: 14 }} maxFontSizeMultiplier={1}>
            {badgeCount > 99 ? "99+" : String(badgeCount)}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
