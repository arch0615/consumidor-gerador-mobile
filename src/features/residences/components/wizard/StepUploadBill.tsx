import { ScanLine, Sparkles } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { useFormState } from "react-hook-form";
import { ACVELCard, AppText, DocumentUploader, FormFieldAnchor, InfoCard, SectionHeader } from "@/components";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";
import type { NewResidenceWizard } from "../../hooks/useNewResidenceWizard";

const TIPS = ["Conta completa, sem cortes", "Boa iluminação, sem reflexos", "Número da instalação (UC) legível"] as const;

export function StepUploadBill({ wizard }: { wizard: NewResidenceWizard }) {
  const theme = useTheme();
  const { errors } = useFormState({ control: wizard.form.control, name: "billDocumentId" });
  const { upload, extraction } = wizard;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <SectionHeader title="Envie sua conta de luz" subtitle="Use a fatura mais recente da distribuidora." />
      <FormFieldAnchor name="billDocumentId">
        <DocumentUploader
          label="Conta de luz"
          file={upload.file}
          status={upload.status}
          onFileSelected={(file) => void wizard.selectBill(file)}
          onRemove={wizard.removeBill}
          onRetry={upload.retry}
          error={errors.billDocumentId?.message}
        />
      </FormFieldAnchor>

      {extraction.isPending ? (
        <ACVELCard variant="muted">
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }} accessibilityLiveRegion="polite">
            <ActivityIndicator color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="subheadStrong">Lendo sua conta…</AppText>
              <AppText variant="footnote" tone="secondary">
                Estamos identificando titular, UC e endereço.
              </AppText>
            </View>
          </View>
        </ACVELCard>
      ) : null}
      {extraction.isSuccess ? (
        <InfoCard tone="success" icon={Sparkles} title="Dados identificados" message="Preenchemos a próxima etapa com as informações da conta. É só conferir." />
      ) : null}
      {extraction.isError ? (
        <InfoCard tone="warning" title="Não conseguimos ler a conta" message={`${errorMessage(extraction.error)} Você pode tentar de novo ou preencher os dados manualmente.`} actionLabel="Tentar ler novamente" onAction={wizard.retryExtraction} />
      ) : null}

      {!upload.file ? (
        <ACVELCard variant="muted">
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
              <ScanLine size={theme.sizing.iconMd} color={theme.colors.primary} />
              <AppText variant="subheadStrong">Dicas para uma boa foto</AppText>
            </View>
            {TIPS.map((tip) => (
              <AppText key={tip} variant="footnote" tone="secondary">
                • {tip}
              </AppText>
            ))}
          </View>
        </ACVELCard>
      ) : null}
    </View>
  );
}
