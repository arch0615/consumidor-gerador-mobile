import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/navigation/screen-options";

export default function SupportLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: "Ajuda e suporte" }} />
      <Stack.Screen name="[id]" options={{ title: "Chamado" }} />
      <Stack.Screen name="new" options={{ title: "Novo chamado" }} />
    </Stack>
  );
}
