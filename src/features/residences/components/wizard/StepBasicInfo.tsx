import { View } from "react-native";
import { FormSegmented, FormSelect, InfoCard, SectionHeader } from "@/components";
import { useTheme } from "@/theme";
import { RESIDENCE_TYPE_LABEL } from "@/utils/status-labels";
import type { NewResidenceWizard } from "../../hooks/useNewResidenceWizard";
import { RESIDENCE_TYPES } from "../../schemas";

const TYPE_OPTIONS = RESIDENCE_TYPES.map((type) => ({ value: type, label: RESIDENCE_TYPE_LABEL[type] }));
const HOLDER_SEGMENTS = [
  { value: "SELF", label: "Está no meu nome" },
  { value: "OTHER", label: "Outra pessoa" }
] as const;

export function StepBasicInfo({ wizard }: { wizard: NewResidenceWizard }) {
  const theme = useTheme();
  const { control } = wizard.form;
  return (
    <View style={{ gap: theme.spacing.md }}>
      <SectionHeader title="Sobre o imóvel" subtitle="Essas informações ajudam a calcular sua economia." />
      <FormSelect control={control} name="type" label="Tipo de imóvel" options={TYPE_OPTIONS} />
      <FormSegmented control={control} name="holder" label="Titular da conta de luz" segments={HOLDER_SEGMENTS} accessibilityLabel="Titular da conta de luz" />
      <InfoCard tone="info" title="Tenha a conta de luz em mãos" message="No próximo passo você fotografa ou envia o PDF da última fatura. Nós lemos os dados para você." />
    </View>
  );
}
