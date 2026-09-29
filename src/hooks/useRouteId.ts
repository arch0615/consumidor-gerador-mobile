import { useLocalSearchParams } from "expo-router";

/** The `[id]` segment of the current route as a plain string. */
export function useRouteId(): string {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  return Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
}
