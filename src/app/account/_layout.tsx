import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/navigation/screen-options";

export default function AccountLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="profile" options={{ title: "Dados pessoais" }} />
      <Stack.Screen name="settings" options={{ title: "Configurações" }} />
      <Stack.Screen name="documents" options={{ title: "Documentos" }} />
      <Stack.Screen name="security" options={{ title: "Segurança" }} />
      <Stack.Screen name="delete" options={{ title: "Excluir conta" }} />
    </Stack>
  );
}
