import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo, type PropsWithChildren } from "react";
import { useTheme } from "@/theme";

/** Bridges app tokens to React Navigation (no white flashes between screens). */
export function NavigationTheme({ children }: PropsWithChildren) {
  const theme = useTheme();
  const navigationTheme = useMemo(() => {
    const base = theme.mode === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.canvas,
        card: theme.colors.surface,
        text: theme.colors.textPrimary,
        border: theme.colors.border,
        notification: theme.colors.danger.fg
      }
    };
  }, [theme]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.canvas);
  }, [theme.colors.canvas]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      {children}
    </NavigationThemeProvider>
  );
}
