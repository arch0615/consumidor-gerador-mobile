import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/navigation/screen-options";

export default function BenefitsLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="statement" options={{ title: "Extrato de pontos" }} />
      <Stack.Screen name="redemptions" options={{ title: "Meus resgates" }} />
      <Stack.Screen name="reward/[id]" options={{ title: "Recompensa" }} />
      <Stack.Screen name="referral" options={{ title: "Indique e ganhe" }} />
    </Stack>
  );
}
