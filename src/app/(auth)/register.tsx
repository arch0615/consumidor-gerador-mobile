import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Lock, Mail, Phone, User } from "lucide-react-native";
import { useForm, useWatch } from "react-hook-form";
import { View } from "react-native";
import { ACVELButton, AppText, FormCheckbox, FormInput, FormScrollProvider, InfoCard, PasswordChecklist, Screen, SectionHeader, useFormScroll } from "@/components";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { useRegister } from "@/features/auth/hooks/useAuth";
import { registerSchema, type RegisterFormInput, type RegisterFormOutput } from "@/features/auth/schemas";
import { useTheme } from "@/theme";
import { errorMessage, toAppError } from "@/utils/app-error";
import { formatPhone } from "@/utils/format";

const DEFAULTS: RegisterFormInput = { name: "", email: "", phone: "", password: "", confirmPassword: "", acceptedTerms: false };

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const register = useRegister();
  const formScroll = useFormScroll<RegisterFormInput>();
  const form = useForm<RegisterFormInput, unknown, RegisterFormOutput>({ resolver: zodResolver(registerSchema), defaultValues: DEFAULTS, mode: "onTouched" });
  const password = useWatch({ control: form.control, name: "password" });

  const submit = form.handleSubmit(
    (values) =>
      register.mutate(
        { name: values.name, email: values.email, phone: values.phone, password: values.password, acceptedTerms: true },
        { onSuccess: () => router.replace("/register-success") }
      ),
    formScroll.onInvalid
  );

  return (
    <Screen
      keyboardAware
      scrollRef={formScroll.scrollRef}
      footer={<ACVELButton label="Criar conta" loading={register.isPending} loadingLabel="Criando conta…" onPress={() => void submit()} />}
    >
      <AuthHeader showLogo={false} title="Vamos começar" subtitle="Crie sua conta em poucos passos. Depois você cadastra sua conta de luz." />
      {register.isError ? (
        <InfoCard
          tone="danger"
          title="Não foi possível criar a conta"
          message={errorMessage(register.error)}
          {...(toAppError(register.error).code === "EMAIL_ALREADY_REGISTERED"
            ? { actionLabel: "Ir para o login", onAction: () => router.back() }
            : {})}
        />
      ) : null}

      <FormScrollProvider registry={formScroll.registry}>
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Seus dados" />
          <FormInput control={form.control} name="name" label="Nome completo" icon={User} autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => form.setFocus("email")} />
          <FormInput control={form.control} name="email" label="E-mail" icon={Mail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => form.setFocus("phone")} />
          <FormInput control={form.control} name="phone" label="Celular" icon={Phone} mask={formatPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="(00) 00000-0000" maxLength={15} helper="Usaremos para avisos importantes sobre sua conta." returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => form.setFocus("password")} />

          <SectionHeader title="Crie sua senha" />
          <FormInput control={form.control} name="password" label="Senha" icon={Lock} password autoComplete="new-password" textContentType="newPassword" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => form.setFocus("confirmPassword")} />
          <PasswordChecklist value={password} />
          <FormInput control={form.control} name="confirmPassword" label="Confirme a senha" icon={Lock} password autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={() => void submit()} />

          <FormCheckbox control={form.control} name="acceptedTerms" accessibilityLabel="Li e aceito os Termos de Uso e a Política de Privacidade">
            <AppText variant="subhead">
              Li e aceito os <AppText variant="subheadStrong" tone="brand">Termos de Uso</AppText> e a{" "}
              <AppText variant="subheadStrong" tone="brand">Política de Privacidade</AppText>.
            </AppText>
          </FormCheckbox>
        </View>
      </FormScrollProvider>
    </Screen>
  );
}
