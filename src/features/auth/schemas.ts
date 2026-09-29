import { z } from "zod";
import { emailField, passwordField, phoneField, requiredText } from "@/utils/validation";

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Informe sua senha.")
});
export type LoginForm = z.input<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailField });
export type ForgotPasswordForm = z.input<typeof forgotPasswordSchema>;

export const registerSchema = z
  .object({
    name: requiredText("Informe seu nome completo.").refine((v) => v.trim().split(/\s+/).length >= 2, "Informe nome e sobrenome."),
    email: emailField,
    phone: phoneField,
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirme sua senha."),
    acceptedTerms: z.boolean().refine((v) => v, "Você precisa aceitar os termos para continuar.")
  })
  .refine((form) => form.password === form.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });
export type RegisterFormInput = z.input<typeof registerSchema>;
export type RegisterFormOutput = z.output<typeof registerSchema>;
