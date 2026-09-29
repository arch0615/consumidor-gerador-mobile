import * as Haptics from "expo-haptics";
import { CircleCheck } from "lucide-react-native";
import { useEffect } from "react";
import { AccessibilityInfo, View } from "react-native";
import { ACVELButton, AppText } from "@/components";
import { useTheme } from "@/theme";
import { formatCurrency } from "@/utils/format";

export interface PaymentConfirmedProps {
  amount: number;
  onViewInvoice: () => void;
  onGoHome: () => void;
}

/** Success state after a confirmed payment (haptic + screen-reader announcement). */
export function PaymentConfirmed({ amount, onViewInvoice, onGoHome }: PaymentConfirmedProps) {
  const theme = useTheme();
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility("Pagamento confirmado");
  }, []);
  return (
    <View style={{ alignItems: "center", gap: theme.spacing.md, paddingVertical: theme.spacing.xl }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: theme.colors.success.bg, alignItems: "center", justifyContent: "center" }}>
        <CircleCheck size={56} color={theme.colors.success.fg} />
      </View>
      <AppText variant="title1" align="center" accessibilityRole="header">
        Pagamento confirmado!
      </AppText>
      <AppText variant="body" tone="secondary" align="center">
        Recebemos {formatCurrency(amount)}. O comprovante fica disponível no histórico de pagamentos.
      </AppText>
      <View style={{ alignSelf: "stretch", gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
        <ACVELButton label="Ver fatura" onPress={onViewInvoice} />
        <ACVELButton label="Voltar ao início" variant="tertiary" onPress={onGoHome} />
      </View>
    </View>
  );
}
