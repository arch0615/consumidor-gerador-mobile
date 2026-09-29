import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { ACVELButton, ACVELModal, ErrorState, FormScrollProvider, InfoCard, LoadingState, ProgressSteps, Screen } from "@/components";
import { StepBasicInfo } from "@/features/residences/components/wizard/StepBasicInfo";
import { StepConfirmation } from "@/features/residences/components/wizard/StepConfirmation";
import { StepReview } from "@/features/residences/components/wizard/StepReview";
import { StepUploadBill } from "@/features/residences/components/wizard/StepUploadBill";
import { useNewResidenceWizard, WIZARD_STEPS } from "@/features/residences/hooks/useNewResidenceWizard";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";

type LeaveAction = Parameters<Parameters<typeof usePreventRemove>[1]>[0]["data"]["action"];

export default function NewResidenceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  // `?edit=<id>` corrects and resubmits an existing registration (e.g. after "Ajustes necessários").
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const wizard = useNewResidenceWizard(typeof edit === "string" && edit !== "" ? edit : null);
  const blocked = !wizard.editing && wizard.availability.data?.canCreate === false;
  const [pendingLeave, setPendingLeave] = useState<LeaveAction | null>(null);

  // Confirm before discarding a half-filled wizard (header back / swipe / Android back).
  usePreventRemove(wizard.hasUnsavedInput, ({ data }) => setPendingLeave(data.action));

  const footer = wizard.isDone ? (
    <View style={{ gap: theme.spacing.xs }}>
      <ACVELButton label="Ver unidade" onPress={() => wizard.created && router.replace(routes.residence(wizard.created.id))} />
      <ACVELButton label="Voltar ao início" variant="tertiary" onPress={() => router.navigate(routes.home)} />
    </View>
  ) : (
    <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
      {wizard.step > 0 ? (
        <View style={{ flex: 1 }}>
          <ACVELButton label="Voltar" variant="secondary" onPress={wizard.back} disabled={wizard.submitMutation.isPending} />
        </View>
      ) : null}
      <View style={{ flex: 2 }}>
        {wizard.isReviewStep ? (
          <ACVELButton label={wizard.editing ? "Reenviar para análise" : "Enviar cadastro"} loading={wizard.submitMutation.isPending} loadingLabel="Enviando…" onPress={() => void wizard.submit()} />
        ) : (
          <ACVELButton label="Continuar" disabled={wizard.upload.isUploading || blocked} onPress={() => void wizard.next()} />
        )}
      </View>
    </View>
  );

  return (
    <Screen keyboardAware scrollRef={wizard.formScroll.scrollRef} footer={wizard.editing && !wizard.existing.data ? undefined : footer}>
      {wizard.editing ? <Stack.Screen options={{ title: "Corrigir cadastro" }} /> : null}
      {wizard.editing && wizard.existing.isPending ? <LoadingState layout="detail" /> : null}
      {wizard.editing && wizard.existing.isError ? <ErrorState message={errorMessage(wizard.existing.error)} onRetry={() => void wizard.existing.refetch()} /> : null}
      {blocked ? <InfoCard tone="warning" title="Cadastro de unidade indisponível" message={wizard.availability.data?.reason ?? ""} /> : null}
      <ProgressSteps steps={WIZARD_STEPS} current={wizard.step} />
      <FormScrollProvider registry={wizard.formScroll.registry}>
        {wizard.step === 0 ? <StepBasicInfo wizard={wizard} /> : null}
        {wizard.step === 1 ? <StepUploadBill wizard={wizard} /> : null}
        {wizard.step === 2 ? <StepReview wizard={wizard} /> : null}
        {wizard.created ? <StepConfirmation residence={wizard.created} resubmitted={wizard.editing} /> : null}
      </FormScrollProvider>

      <ACVELModal
        visible={pendingLeave !== null}
        tone="destructive"
        title="Descartar cadastro?"
        message="Os dados preenchidos e a conta enviada serão perdidos."
        confirmLabel="Descartar"
        cancelLabel="Continuar cadastro"
        onCancel={() => setPendingLeave(null)}
        onConfirm={() => {
          const action = pendingLeave;
          setPendingLeave(null);
          if (action) navigation.dispatch(action);
        }}
      />
    </Screen>
  );
}
