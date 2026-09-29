import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/navigation/screen-options";

export default function ResidenceLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: "Minhas unidades" }} />
      <Stack.Screen name="[id]" options={{ title: "Unidade" }} />
      <Stack.Screen name="new" options={{ title: "Nova unidade" }} />
    </Stack>
  );
}
