import { focusManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

/** Refetch stale queries when the app returns to the foreground. */
export function useAppStateFocus(): void {
  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    const subscription = AppState.addEventListener("change", (status) => focusManager.setFocused(status === "active"));
    return () => subscription.remove();
  }, []);
}
