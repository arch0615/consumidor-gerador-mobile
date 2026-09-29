import { zodResolver } from "@hookform/resolvers/zod";
import * as Haptics from "expo-haptics";
import { IdCard, Mail, Phone, User } from "lucide-react-native";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { ACVELButton, ACVELInput, FormInput, FormScrollProvider, InfoCard, QueryView, Screen, SectionHeader, useFormScroll } from "@/components";
import { useProfile, useUpdateProfile } from "@/features/profile/hooks/useAccount";
import { profileSchema, type ProfileFormInput } from "@/features/profile/schemas";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";
import { formatPhone, maskCpf, onlyDigits } from "@/utils/format";

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useProfile();
  const update = useUpdateProfile();
  const formScroll = useFormScroll<ProfileFormInput>();
  const form = useForm<ProfileFormInput>({ resolver: zodResolver(profileSchema), defaultValues: { displayName: "", phone: "" }, mode: "onTouched" });
  const { isDirty } = form.formState;

  // Load server values into the form (and after each successful save).
  useEffect(() => {
    if (!profile.data) return;
    form.reset({ displayName: profile.data.displayName, phone: formatPhone(onlyDigits(profile.data.phone ?? "").replace(/^55/, "")) });
  }, [profile.data, form]);

  const submit = form.handleSubmit(
    (values) =>
      update.mutate(
        { displayName: values.displayName, phone: onlyDigits(values.phone) },
        { onSuccess: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) }
      ),
    formScroll.onInvalid
  );

  return (
    <Screen
      keyboardAware
      scrollRef={formScroll.scrollRef}
      footer={profile.data ? <ACVELButton label="Salvar alterações" disabled={!isDirty} loading={update.isPending} loadingLabel="Salvando…" onPress={() => void submit()} /> : undefined}
    >
      <QueryView query={profile} loading="detail" loadingRows={3}>
        {(me) => (
          <FormScrollProvider registry={formScroll.registry}>
            <View style={{ gap: theme.spacing.md }}>
              {update.isSuccess && !isDirty ? <InfoCard tone="success" title="Dados atualizados" /> : null}
              {update.isError ? <InfoCard tone="danger" title="Não foi possível salvar" message={errorMessage(update.error)} /> : null}
              <SectionHeader title="Contato" />
              <FormInput control={form.control} name="displayName" label="Nome completo" icon={User} autoCapitalize="words" autoComplete="name" textContentType="name" />
              <FormInput control={form.control} name="phone" label="Celular" icon={Phone} mask={formatPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" maxLength={15} />
              <SectionHeader title="Dados de acesso" subtitle="Para alterar, fale com o suporte." />
              <ACVELInput label="E-mail" icon={Mail} value={me.email} editable={false} />
              <ACVELInput label={me.personType === "FISICA" ? "CPF" : "CNPJ"} icon={IdCard} value={me.personType === "FISICA" ? maskCpf(me.document) : me.document} editable={false} />
            </View>
          </FormScrollProvider>
        )}
      </QueryView>
    </Screen>
  );
}
