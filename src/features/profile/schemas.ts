import { z } from "zod";
import { passwordField, phoneField, requiredText } from "@/utils/validation";

export const profileSchema = z.object({
  displayName: requiredText("Informe seu nome completo.").refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome."),
  phone: phoneField
});
export type ProfileFormInput = z.input<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Confirme a nova senha.")
  })
  .refine((form) => form.newPassword === form.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." })
  .refine((form) => form.newPassword !== form.currentPassword, { path: ["newPassword"], message: "A nova senha deve ser diferente da atual." });
export type ChangePasswordForm = z.input<typeof changePasswordSchema>;

/** Deletion request: the API takes no reason field, so none is collected. */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Informe sua senha para confirmar."),
  acknowledged: z.boolean().refine((v) => v, "Confirme que você leu as consequências.")
});
export type DeleteAccountForm = z.input<typeof deleteAccountSchema>;
