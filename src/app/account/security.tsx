import { zodResolver } from "@hookform/resolvers/zod";
import * as Haptics from "expo-haptics";
import { KeyRound, Lock } from "lucide-react-native";
import { useForm, useWatch } from "react-hook-form";
import { View } from "react-native";
import { ACVELButton, FormInput, FormScrollProvider, InfoCard, PasswordChecklist, Screen, SectionHeader, useFormScroll } from "@/components";
import { useChangePassword } from "@/features/profile/hooks/useAccount";
import { changePasswordSchema, type ChangePasswordForm } from "@/features/profile/schemas";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";

const DEFAULTS: ChangePasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function SecurityScreen() {
  const theme = useTheme();
  const changePassword = useChangePassword();
  const formScroll = useFormScroll<ChangePasswordForm>();
  const form = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema), defaultValues: DEFAULTS, mode: "onTouched" });
  const newPassword = useWatch({ control: form.control, name: "newPassword" });

  const submit = form.handleSubmit(
    (values) =>
      changePassword.mutate(
        { currentPassword: values.currentPassword, newPassword: values.newPassword },
        {
          onSuccess: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            form.reset(DEFAULTS);
          }
        }
      ),
    formScroll.onInvalid
  );

  return (
    <Screen keyboardAware scrollRef={formScroll.scrollRef} footer={<ACVELButton label="Alterar senha" icon={KeyRound} loading={changePassword.isPending} loadingLabel="Alterando…" onPress={() => void submit()} />}>
      {changePassword.isSuccess ? <InfoCard tone="success" title="Senha alterada" message="Use a nova senha no próximo acesso." /> : null}
      {changePassword.isError ? <InfoCard tone="danger" title="Não foi possível alterar a senha" message={errorMessage(changePassword.error)} /> : null}
      <FormScrollProvider registry={formScroll.registry}>
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Alterar senha" subtitle="Por segurança, confirme sua senha atual." />
          <FormInput control={form.control} name="currentPassword" label="Senha atual" icon={Lock} password autoComplete="current-password" textContentType="password" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => form.setFocus("newPassword")} />
          <FormInput control={form.control} name="newPassword" label="Nova senha" icon={Lock} password autoComplete="new-password" textContentType="newPassword" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => form.setFocus("confirmPassword")} />
          <PasswordChecklist value={newPassword} />
          <FormInput control={form.control} name="confirmPassword" label="Confirme a nova senha" icon={Lock} password autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={() => void submit()} />
        </View>
      </FormScrollProvider>
    </Screen>
  );
}
