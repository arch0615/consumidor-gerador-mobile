import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/navigation/screen-options";

export const unstable_settings = { initialRouteName: "login" };

export default function AuthLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ title: "Recuperar senha" }} />
      <Stack.Screen name="register" options={{ title: "Criar conta" }} />
      <Stack.Screen name="register-success" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
