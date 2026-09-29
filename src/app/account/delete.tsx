import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { ACVELButton, ACVELCard, ACVELModal, AppText, FormCheckbox, FormInput, FormScrollProvider, InfoCard, QueryView, Screen, SectionHeader, useFormScroll } from "@/components";
import { useCancelDeletion, useDeleteAccount, useDeletionRequest } from "@/features/profile/hooks/useAccount";
import { deleteAccountSchema, type DeleteAccountForm } from "@/features/profile/schemas";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";
import { formatDateTime } from "@/utils/format";

const CONSEQUENCES = [
  "Seu acesso ao app e ao site será encerrado.",
  "Os contratos das suas unidades serão cancelados, respeitando o aviso prévio.",
  "Faturas em aberto continuam devidas e serão enviadas por e-mail.",
  "Dados fiscais são mantidos pelo prazo exigido em lei (LGPD, art. 16)."
] as const;

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const deletionRequest = useDeletionRequest();
  const deleteAccount = useDeleteAccount();
  const cancelDeletion = useCancelDeletion();
  const formScroll = useFormScroll<DeleteAccountForm>();
  const form = useForm<DeleteAccountForm>({ resolver: zodResolver(deleteAccountSchema), defaultValues: { password: "", acknowledged: false }, mode: "onTouched" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const openRequest = deletionRequest.data?.status === "REQUESTED" ? deletionRequest.data : null;

  // Validate first, then ask for explicit confirmation in a dialog.
  const requestConfirmation = form.handleSubmit(() => setConfirmOpen(true), formScroll.onInvalid);
  const confirm = form.handleSubmit((values) => deleteAccount.mutate({ password: values.password }, { onError: () => setConfirmOpen(false) }));

  return (
    <Screen
      keyboardAware
      scrollRef={formScroll.scrollRef}
      footer={deletionRequest.isSuccess && !openRequest ? <ACVELButton label="Excluir minha conta" variant="destructive" onPress={() => void requestConfirmation()} /> : undefined}
    >
      <QueryView query={deletionRequest} loading="detail" loadingRows={2}>
        {() =>
          openRequest ? (
            <View style={{ gap: theme.spacing.md }}>
              <InfoCard tone="warning" title="Exclusão solicitada" message={`Pedido registrado em ${formatDateTime(openRequest.requestedAt)}. Enquanto não for concluído, você pode desistir.`} />
              {cancelDeletion.isError ? <InfoCard tone="danger" title="Não foi possível cancelar" message={errorMessage(cancelDeletion.error)} /> : null}
              {cancelDeletion.isSuccess ? <InfoCard tone="success" title="Solicitação cancelada" message="Sua conta continua ativa." /> : null}
              <ACVELButton label="Cancelar solicitação de exclusão" variant="secondary" loading={cancelDeletion.isPending} onPress={() => cancelDeletion.mutate()} />
            </View>
          ) : (
            <View style={{ gap: theme.spacing.lg }}>
              <InfoCard tone="danger" icon={TriangleAlert} title="Atenção: exclusão de conta" message="Depois de concluída, a exclusão não pode ser desfeita." />
              <ACVELCard>
                <View style={{ gap: theme.spacing.xs }}>
                  <AppText variant="subheadStrong">Ao excluir sua conta:</AppText>
                  {CONSEQUENCES.map((item) => (
                    <AppText key={item} variant="subhead" tone="secondary">
                      • {item}
                    </AppText>
                  ))}
                </View>
              </ACVELCard>
              {deleteAccount.isError ? <InfoCard tone="danger" title="Não foi possível solicitar a exclusão" message={errorMessage(deleteAccount.error)} /> : null}
              <FormScrollProvider registry={formScroll.registry}>
                <View style={{ gap: theme.spacing.md }}>
                  <SectionHeader title="Confirme a exclusão" subtitle="Por segurança, informe sua senha." />
                  <FormInput control={form.control} name="password" label="Senha" icon={Lock} password autoComplete="current-password" textContentType="password" />
                  <FormCheckbox control={form.control} name="acknowledged" label="Li e entendo que minha conta e meus contratos serão encerrados." />
                </View>
              </FormScrollProvider>
            </View>
          )
        }
      </QueryView>
      <ACVELModal
        visible={confirmOpen}
        tone="destructive"
        icon={TriangleAlert}
        title="Solicitar exclusão da conta?"
        message="Você será desconectado deste aparelho. A exclusão segue o prazo previsto na LGPD."
        confirmLabel="Solicitar exclusão"
        cancelLabel="Manter conta"
        confirmLoading={deleteAccount.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void confirm()}
      />
    </Screen>
  );
}
