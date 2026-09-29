import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/**
 * Connects NetInfo to TanStack Query's onlineManager once (queries pause when
 * offline and refetch on reconnect) and exposes the current status.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  })
);

function subscribe(listener: () => void): () => void {
  return onlineManager.subscribe(listener);
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribe, () => onlineManager.isOnline());
}
