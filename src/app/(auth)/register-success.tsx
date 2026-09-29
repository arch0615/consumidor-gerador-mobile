import { Redirect } from "expo-router";
import { CircleCheck, FileText, Zap } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ACVELButton, ACVELCard, AppText, ListItem, Screen } from "@/components";
import { useFinishRegistration } from "@/features/auth/hooks/useAuth";
import { useRegistrationStore } from "@/features/auth/registration.store";
import { useTheme } from "@/theme";

export default function RegisterSuccessScreen() {
  const theme = useTheme();
  const firstName = useRegistrationStore((state) => state.pendingIdentity?.firstName ?? null);
  const hasPending = useRegistrationStore((state) => state.pendingIdentity !== null);
  const finish = useFinishRegistration();
  const [entering, setEntering] = useState(false);

  if (!hasPending) return <Redirect href="/login" />;

  return (
    <Screen
      edges={["top", "bottom"]}
      footer={
        <ACVELButton
          label="Acessar minha conta"
          loading={entering}
          onPress={() => {
            setEntering(true);
            finish();
          }}
        />
      }
    >
      <View style={{ alignItems: "center", gap: theme.spacing.md, paddingTop: theme.spacing.xl }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: theme.colors.success.bg, alignItems: "center", justifyContent: "center" }}>
          <CircleCheck size={48} color={theme.colors.success.fg} />
        </View>
        <AppText variant="title1" align="center" accessibilityRole="header">
          Conta criada{firstName ? `, ${firstName}` : ""}!
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          Agora falta pouco para você começar a economizar com energia limpa.
        </AppText>
      </View>
      <ACVELCard>
        <AppText variant="overline" tone="secondary">
          Próximos passos
        </AppText>
        <ListItem icon={Zap} title="Cadastre sua conta de luz" subtitle="Envie uma foto ou PDF da última fatura" />
        <ListItem icon={FileText} title="Assine o contrato digital" subtitle="Após a análise do seu cadastro" divider={false} />
      </ACVELCard>
    </Screen>
  );
}
