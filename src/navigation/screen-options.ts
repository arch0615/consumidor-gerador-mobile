import type { ComponentProps } from "react";
import type { Stack } from "expo-router";
import { useMemo } from "react";
import { fontFamily, useTheme } from "@/theme";

type StackScreenOptions = NonNullable<ComponentProps<typeof Stack>["screenOptions"]>;

/** Native-stack header styling shared by every stack (themed, flat, minimal back label). */
export function useStackScreenOptions(): Exclude<StackScreenOptions, (...args: never[]) => unknown> {
  const theme = useTheme();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: theme.colors.canvas },
      headerTintColor: theme.colors.primary,
      headerTitleStyle: { fontFamily: fontFamily.semibold, fontSize: theme.typography.title3.fontSize, color: theme.colors.textPrimary },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: "minimal",
      contentStyle: { backgroundColor: theme.colors.canvas },
      animation: "default"
    }),
    [theme]
  );
}
