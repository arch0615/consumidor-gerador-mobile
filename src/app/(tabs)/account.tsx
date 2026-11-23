import Constants from "expo-constants";
import { config } from "@/config/env";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Building, FileText, FlaskConical, Headset, LogOut, Scale, Settings, ShieldCheck, Trash, User, Zap } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ACVELCard, ACVELModal, ACVELSelect, AppText, Avatar, ListItem, PageHeader, QueryView, Screen, SectionHeader } from "@/components";
import { useSignOut } from "@/features/auth/hooks/useAuth";
import { useProfile } from "@/features/profile/hooks/useAccount";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { portalLinks } from "@/navigation/portal-links";
import { routes } from "@/navigation/routes";
import { DEV_SCENARIOS, useDevScenarioStore, type DevScenario } from "@/stores/dev-scenario.store";
import { useTheme } from "@/theme";
import { formatDate } from "@/utils/format";

/** Portal legal page(s) from the environment; one combined entry when terms and privacy are the same page. */
const LEGAL = portalLinks();
const TERMS_URL = LEGAL.terms();
const PRIVACY_URL = LEGAL.legalIsCombined() ? null : LEGAL.privacy();
const SCENARIO_LABEL: Record<DevScenario, string> = {
  normal: "Normal",
  empty: "Sem dados (vazio)",
  error: "Erro do servidor",
  slow: "Rede lenta",
  offline: "Sem conexão"
};

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useProfile();
  const signOut = useSignOut();
  const refresh = useRefreshControl(profile);
  const scenario = useDevScenarioStore((state) => state.scenario);
  const setScenario = useDevScenarioStore((state) => state.setScenario);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  return (
    <Screen edges={["top"]} {...refresh}>
      <PageHeader title="Conta" />

      <ACVELCard onPress={() => router.push(routes.profile)} accessibilityLabel="Dados pessoais" accessibilityHint="Abre seus dados pessoais">
        <QueryView query={profile} loading="list" loadingRows={1}>
          {(me) => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
              <Avatar name={me.displayName} size="lg" />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="title3" numberOfLines={1}>
                  {me.displayName}
                </AppText>
                <AppText variant="footnote" tone="secondary" numberOfLines={1}>
                  {me.email}
                </AppText>
                <AppText variant="caption" tone="tertiary">
                  Cliente desde {formatDate(me.memberSince)}
                </AppText>
              </View>
            </View>
          )}
        </QueryView>
      </ACVELCard>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Minha conta" />
        <ACVELCard padding="xs">
          <ListItem icon={User} title="Dados pessoais" onPress={() => router.push(routes.profile)} divider />
          <ListItem icon={Building} title="Minhas unidades" onPress={() => router.push(routes.residences)} divider />
          <ListItem icon={FileText} title="Documentos" onPress={() => router.push(routes.documents)} divider />
          <ListItem icon={Zap} title="Quero ser gerador" subtitle="Solicite seu perfil de gerador de energia" onPress={() => router.push(routes.generator)} divider />
          <ListItem icon={ShieldCheck} title="Segurança" subtitle="Senha e acesso" onPress={() => router.push(routes.security)} />
        </ACVELCard>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Preferências e ajuda" />
        <ACVELCard padding="xs">
          <ListItem icon={Settings} title="Configurações" subtitle="Aparência e notificações" onPress={() => router.push(routes.settings)} divider />
          <ListItem icon={Headset} title="Ajuda e suporte" onPress={() => router.push(routes.support)} divider={TERMS_URL !== null || PRIVACY_URL !== null} />
          {TERMS_URL ? (
            <ListItem
              icon={Scale}
              title={PRIVACY_URL ? "Termos de uso" : "Termos de uso e privacidade"}
              onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
              divider={PRIVACY_URL !== null}
            />
          ) : null}
          {PRIVACY_URL ? <ListItem icon={ShieldCheck} title="Política de privacidade" onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)} /> : null}
        </ACVELCard>
      </View>

      {__DEV__ && config.useMocks ? (
        <View style={{ gap: theme.spacing.sm }}>
          <SectionHeader title="Ferramentas de desenvolvimento" subtitle="Força o estado das telas com dados simulados" />
          <ACVELCard>
            <ACVELSelect
              label="Cenário dos dados"
              value={scenario}
              options={DEV_SCENARIOS.map((value) => ({ value, label: SCENARIO_LABEL[value] }))}
              onChange={setScenario}
              helper="Puxe para atualizar as telas após trocar o cenário."
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
              <FlaskConical size={theme.sizing.iconSm} color={theme.colors.textTertiary} />
              <AppText variant="caption" tone="tertiary">
                Visível apenas em builds de desenvolvimento
              </AppText>
            </View>
          </ACVELCard>
        </View>
      ) : null}

      <ACVELCard padding="xs">
        <ListItem icon={LogOut} title="Sair da conta" onPress={() => setConfirmSignOut(true)} showChevron={false} divider />
        <ListItem icon={Trash} title="Excluir conta" destructive onPress={() => router.push(routes.deleteAccount)} />
      </ACVELCard>

      <AppText variant="caption" tone="tertiary" align="center">
        ACVEL Consumidor · versão {Constants.expoConfig?.version ?? "—"}
      </AppText>

      <ACVELModal
        visible={confirmSignOut}
        icon={LogOut}
        title="Sair da conta?"
        message="Você precisará entrar novamente com e-mail e senha."
        confirmLabel="Sair"
        confirmLoading={signOut.isPending}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => signOut.mutate()}
      />
    </Screen>
  );
}
