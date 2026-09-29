import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "./ThemeProvider";
import type { Theme } from "./tokens";

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

/**
 * Builds a memoised StyleSheet from the active theme. Every component styles
 * itself through this hook, so no colour/size literals live in components.
 */
export function useThemedStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [factory, theme]);
}
