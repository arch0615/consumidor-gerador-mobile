import { Gauge, Hash, IdCard, MapPin, User } from "lucide-react-native";
import { View } from "react-native";
import { FormInput, FormSelect, InfoCard, SectionHeader } from "@/components";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";
import { formatCep, formatCpfCnpj } from "@/utils/format";
import { BRAZIL_UFS } from "@/utils/validation";
import { useUtilities } from "../../hooks/useResidences";
import type { NewResidenceWizard } from "../../hooks/useNewResidenceWizard";
import type { NewResidenceField } from "../../schemas";

const UF_OPTIONS = BRAZIL_UFS.map((uf) => ({ value: uf, label: uf }));
const CHECK_FIELD = "Confira este campo — a leitura automática pode ter errado.";

export function StepReview({ wizard }: { wizard: NewResidenceWizard }) {
  const theme = useTheme();
  const { control, setFocus } = wizard.form;
  const utilities = useUtilities();
  const utilityOptions = (utilities.data ?? []).map((utility) => ({ value: utility.code, label: utility.name, description: utility.ufs.join(", ") }));
  const hint = (field: NewResidenceField, fallback?: string) => (wizard.lowConfidence.includes(field) ? CHECK_FIELD : fallback);

  return (
    <View style={{ gap: theme.spacing.md }}>
      {wizard.submitMutation.isError ? <InfoCard tone="danger" title="Não foi possível enviar" message={errorMessage(wizard.submitMutation.error)} /> : null}

      <SectionHeader title="Titular da conta" />
      <FormInput control={control} name="holderName" label="Nome do titular" icon={User} autoCapitalize="words" autoComplete="name" helper={hint("holderName")} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => setFocus("holderDocument")} />
      <FormInput control={control} name="holderDocument" label="CPF ou CNPJ do titular" icon={IdCard} mask={formatCpfCnpj} keyboardType="number-pad" maxLength={18} helper={hint("holderDocument")} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => setFocus("ucNumber")} />

      <SectionHeader title="Unidade consumidora" />
      <FormInput control={control} name="ucNumber" label="Número da instalação (UC)" icon={Hash} keyboardType="number-pad" maxLength={15} helper={hint("ucNumber", "Aparece no topo da conta como “Instalação” ou “Unidade consumidora”.")} />
      <FormSelect control={control} name="utilityCode" label="Distribuidora" options={utilityOptions} placeholder={utilities.isPending ? "Carregando…" : "Selecione"} helper={hint("utilityCode")} searchable />
      <FormInput control={control} name="averageConsumptionKwh" label="Consumo médio mensal (kWh)" icon={Gauge} keyboardType="number-pad" maxLength={6} optional helper={hint("averageConsumptionKwh", "Está no histórico de consumo da conta.")} />

      <SectionHeader title="Endereço do imóvel" />
      <FormInput
        control={control}
        name="cep"
        label="CEP"
        icon={MapPin}
        mask={formatCep}
        keyboardType="number-pad"
        autoComplete="postal-code"
        textContentType="postalCode"
        maxLength={9}
        helper={wizard.cepLookup.isPending ? "Buscando endereço…" : wizard.cepLookup.isError ? errorMessage(wizard.cepLookup.error) : hint("cep")}
        onBlur={() => wizard.lookupCep(wizard.form.getValues("cep"))}
      />
      <FormInput control={control} name="street" label="Rua" autoComplete="street-address" textContentType="streetAddressLine1" />
      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <FormInput control={control} name="number" label="Número" keyboardType="numbers-and-punctuation" helper={hint("number")} />
        </View>
        <View style={{ flex: 1.4 }}>
          <FormInput control={control} name="complement" label="Complemento" optional textContentType="streetAddressLine2" />
        </View>
      </View>
      <FormInput control={control} name="district" label="Bairro" textContentType="sublocality" />
      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <View style={{ flex: 2 }}>
          <FormInput control={control} name="city" label="Cidade" textContentType="addressCity" />
        </View>
        <View style={{ flex: 1 }}>
          <FormSelect control={control} name="uf" label="UF" options={UF_OPTIONS} searchable />
        </View>
      </View>
    </View>
  );
}
