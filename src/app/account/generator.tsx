import { CircleCheck, Sun, Zap } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ACVELButton, ACVELCard, ACVELInput, ACVELModal, AppText, InfoCard, ListItem, QueryView, Screen, SectionHeader, StatusChip } from "@/components";
import { useGeneratorAccess, useRequestGeneratorAccess } from "@/features/generator/hooks/useGenerator";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";
import { formatDate } from "@/utils/format";
import { GENERATOR_REQUEST_STATUS } from "@/utils/status-labels";

/** Same content as the portal's "Quero ser gerador" card (/perfil). */
const BENEFITS = [
  "Monetizar energia excedente da sua usina com gestão centralizada da ACVEL.",
  "Acompanhar performance, distribuição e repasses no painel do gerador.",
  "Receber suporte operacional para documentação e validação da usina."
] as const;
const RULES = [
  "Você precisa já ter cadastro ativo como consumidor.",
  "A habilitação de gerador é feita pela equipe administrativa da ACVEL.",
  "O cadastro da usina exige envio documental e aprovação interna."
] as const;
const MAX_MESSAGE = 1000;

export default function GeneratorRequestScreen() {
  const theme = useTheme();
  const access = useGeneratorAccess();
  const request = useRequestGeneratorAccess();
  const refresh = useRefreshControl(access);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const canRequest = access.data !== undefined && !access.data.isGenerator && access.data.openRequest === null;

  const submit = () =>
    request.mutate(message, {
      onSuccess: () => {
        setConfirmOpen(false);
        setMessage("");
      },
      onError: () => setConfirmOpen(false)
    });

  return (
    <Screen keyboardAware {...refresh} footer={canRequest ? <ACVELButton label="Quero ser gerador" icon={Zap} onPress={() => setConfirmOpen(true)} /> : undefined}>
      <QueryView query={access} loading="detail" loadingRows={2}>
        {(state) => (
          <View style={{ gap: theme.spacing.lg }}>
            <ACVELCard variant="hero" padding="lg">
              <View style={{ gap: theme.spacing.xs }}>
                <Sun size={theme.sizing.iconLg} color={theme.colors.accent} />
                <AppText variant="title2" tone="hero">
                  Quero ser gerador de energia
                </AppText>
                <AppText variant="subhead" tone="heroMuted">
                  Se você tem sistema solar com excedente, envie sua solicitação para habilitarmos seu perfil de gerador.
                </AppText>
              </View>
            </ACVELCard>

            {state.isGenerator ? (
              <InfoCard tone="success" icon={CircleCheck} title="Seu perfil de gerador está ativo" message="Suas usinas e repasses estão disponíveis na área do gerador do portal do cliente ACVEL." />
            ) : null}
            {request.isSuccess ? <InfoCard tone="success" title="Solicitação enviada" message="Nossa equipe vai entrar em contato para os próximos passos." /> : null}
            {request.isError ? <InfoCard tone="danger" title="Não foi possível enviar" message={errorMessage(request.error)} /> : null}
            {!state.isGenerator && state.openRequest && !request.isSuccess ? (
              <InfoCard tone="info" title="Solicitação em andamento" message="A equipe ACVEL está analisando seu pedido e vai entrar em contato." />
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="Benefícios" />
              <ACVELCard>
                <View style={{ gap: theme.spacing.xs }}>
                  {BENEFITS.map((item) => (
                    <AppText key={item} variant="subhead">
                      • {item}
                    </AppText>
                  ))}
                </View>
              </ACVELCard>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="Regras" />
              <ACVELCard>
                <View style={{ gap: theme.spacing.xs }}>
                  {RULES.map((item) => (
                    <AppText key={item} variant="subhead">
                      • {item}
                    </AppText>
                  ))}
                </View>
              </ACVELCard>
            </View>

            {state.requests.length > 0 ? (
              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Minhas solicitações" />
                <ACVELCard padding="xs">
                  {state.requests.map((item, index) => (
                    <ListItem
                      key={item.id}
                      icon={Zap}
                      title={`Solicitação de ${formatDate(item.createdAt.slice(0, 10))}`}
                      {...(item.message ? { subtitle: item.message } : {})}
                      trailing={<StatusChip status={GENERATOR_REQUEST_STATUS[item.status]} size="sm" />}
                      divider={index < state.requests.length - 1}
                    />
                  ))}
                </ACVELCard>
              </View>
            ) : null}

            {canRequest ? (
              <ACVELInput
                label="Mensagem (opcional)"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={MAX_MESSAGE}
                placeholder="Conte sobre seu sistema solar (potência, local…)"
              />
            ) : null}
          </View>
        )}
      </QueryView>

      <ACVELModal
        visible={confirmOpen}
        icon={Zap}
        title="Confirmar solicitação"
        message="Deseja enviar agora sua solicitação para se tornar gerador de energia? A equipe ACVEL vai analisar e entrar em contato."
        confirmLabel="Confirmar solicitação"
        confirmLoading={request.isPending}
        onCancel={() => !request.isPending && setConfirmOpen(false)}
        onConfirm={submit}
      />
    </Screen>
  );
}
