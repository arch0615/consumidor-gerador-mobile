import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Mail, MailCheck } from "lucide-react-native";
import { useForm } from "react-hook-form";
import { ACVELButton, EmptyState, FormInput, InfoCard, Screen } from "@/components";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { usePasswordReset } from "@/features/auth/hooks/useAuth";
import { forgotPasswordSchema, type ForgotPasswordForm } from "@/features/auth/schemas";
import { errorMessage } from "@/utils/app-error";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const reset = usePasswordReset();
  const form = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" }, mode: "onTouched" });
  const submit = form.handleSubmit((values) => reset.mutate(values.email.trim().toLowerCase()));

  if (reset.isSuccess) {
    return (
      <Screen>
        <EmptyState
          icon={MailCheck}
          title="Verifique seu e-mail"
          message={`Se houver uma conta para ${reset.variables}, você receberá um link para criar uma nova senha. Confira também a caixa de spam.`}
          action={{ label: "Voltar para o login", onPress: () => router.back() }}
          secondaryAction={{ label: "Reenviar e-mail", onPress: () => reset.mutate(reset.variables) }}
        />
      </Screen>
    );
  }

  return (
    <Screen keyboardAware footer={<ACVELButton label="Enviar link" loading={reset.isPending} loadingLabel="Enviando…" onPress={() => void submit()} />}>
      <AuthHeader showLogo={false} title="Esqueceu a senha?" subtitle="Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha." />
      {reset.isError ? <InfoCard tone="danger" title="Não foi possível enviar" message={errorMessage(reset.error)} /> : null}
      <FormInput
        control={form.control}
        name="email"
        label="E-mail"
        icon={Mail}
        placeholder="nome@exemplo.com.br"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        returnKeyType="send"
        onSubmitEditing={() => void submit()}
      />
    </Screen>
  );
}
