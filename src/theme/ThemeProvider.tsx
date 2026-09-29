import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";
import { usePreferencesStore } from "@/stores/preferences.store";
import { buildTheme, type Theme } from "./tokens";

const ThemeContext = createContext<Theme | null>(null);

/** Resolves the active theme from the user preference (Sistema / Claro / Escuro). */
export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const mode = themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : themeMode;
  const theme = useMemo(() => buildTheme(mode), [mode]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider");
  return theme;
}
