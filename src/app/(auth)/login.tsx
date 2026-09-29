import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { LogIn, Lock, Mail } from "lucide-react-native";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import { ACVELButton, AppText, FormInput, FormScrollProvider, InfoCard, Screen, useFormScroll } from "@/components";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { useRememberedEmail, useSignIn } from "@/features/auth/hooks/useAuth";
import { loginSchema, type LoginForm } from "@/features/auth/schemas";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const signIn = useSignIn();
  const notice = useAuthStore((state) => state.notice);
  const demo = authService.demoCredentials;
  const remembered = useRememberedEmail();
  const formScroll = useFormScroll<LoginForm>();
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" }, mode: "onTouched" });

  useEffect(() => {
    if (remembered.email && !form.getValues("email")) form.setValue("email", remembered.email);
  }, [remembered.email, form]);

  const submit = form.handleSubmit((values) => signIn.mutate({ email: values.email, password: values.password }), formScroll.onInvalid);

  return (
    <Screen edges={["top", "bottom"]} keyboardAware scrollRef={formScroll.scrollRef}>
      <AuthHeader title="Acesse sua conta" subtitle="Acompanhe sua economia, faturas e unidades em um só lugar." />

      {notice && !signIn.isPending ? <InfoCard tone={notice.tone} title={notice.title} message={notice.message} /> : null}
      {signIn.isError ? <InfoCard tone="danger" title="Não foi possível entrar" message={errorMessage(signIn.error)} /> : null}

      <FormScrollProvider registry={formScroll.registry}>
        <View style={{ gap: theme.spacing.md }}>
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
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus("password")}
          />
          <FormInput
            control={form.control}
            name="password"
            label="Senha"
            icon={Lock}
            password
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
          <View style={{ alignItems: "flex-end" }}>
            <ACVELButton label="Esqueci minha senha" variant="tertiary" size="sm" fullWidth={false} onPress={() => router.push("/forgot-password")} />
          </View>
        </View>
      </FormScrollProvider>

      <ACVELButton label="Entrar" icon={LogIn} loading={signIn.isPending} loadingLabel="Entrando…" onPress={() => void submit()} />

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <AppText variant="subhead" tone="secondary">
          Ainda não tem conta?
        </AppText>
        <ACVELButton label="Criar conta" variant="tertiary" size="sm" fullWidth={false} onPress={() => router.push("/register")} />
      </View>

      {__DEV__ && demo ? (
        <InfoCard
          tone="info"
          title="Modo demonstração"
          message={`Dados simulados. Use ${demo.email} / ${demo.password}.`}
          actionLabel="Preencher"
          onAction={() => {
            form.setValue("email", demo.email, { shouldValidate: true });
            form.setValue("password", demo.password, { shouldValidate: true });
          }}
        />
      ) : null}
    </Screen>
  );
}
