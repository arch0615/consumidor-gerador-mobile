import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/navigation/screen-options";

export default function InvoiceLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="[id]/index" options={{ title: "Detalhes da fatura" }} />
      <Stack.Screen name="[id]/pix" options={{ title: "Pagar com Pix" }} />
      <Stack.Screen name="[id]/boleto" options={{ title: "Pagar com boleto" }} />
      <Stack.Screen name="payments" options={{ title: "Histórico de pagamentos" }} />
    </Stack>
  );
}
