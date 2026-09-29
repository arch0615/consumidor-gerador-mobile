import { z } from "zod";
import type { PersonType, UserProfile } from "@/types/domain";
import { isAppError } from "@/utils/app-error";
import { onlyDigits } from "@/utils/format";
import type { AccountService } from "../account.service";
import { api } from "../api/apiClient";
import { zIgnoredBody } from "../api/schema";
import { authService } from "../auth.service";
import { meSchema, type MeResult } from "./me";
import { fetchConsumer, requireConsumer, type Consumer } from "./business";
import { documentSignedUrl, listConsumerDocuments, uploadConsumerDocument } from "./documents";

const deletionSchema = z
  .object({ id: z.string(), status: z.enum(["REQUESTED", "ANONYMIZED", "CANCELLED"]), requested_at: z.string() })
  .transform((request) => ({ id: request.id, status: request.status, requestedAt: request.requested_at }));

/** Merges the auth identity (name/phone, canonical) with the business consumer record (document, referral…). */
function toProfile(me: MeResult, consumer: Consumer | null): UserProfile {
  const document = onlyDigits(consumer?.cpf_cnpj ?? consumer?.cpf ?? consumer?.cnpj ?? me.document ?? "");
  const personType: PersonType = consumer?.tipo_pessoa ?? (document.length === 14 ? "JURIDICA" : "FISICA");
  const onboarding = me.identity.onboardingStatus;
  return {
    userId: me.identity.userId,
    consumerId: me.identity.consumerId ?? consumer?.id ?? "",
    displayName: me.identity.displayName,
    firstName: me.identity.firstName,
    email: me.identity.email,
    phone: me.phoneNumber ?? consumer?.celular ?? consumer?.whatsapp ?? consumer?.telefone ?? null,
    personType,
    document,
    onboardingStatus: onboarding === "SUSPENSO" || onboarding === null ? "DRAFT" : onboarding,
    onboardingCompleted: me.identity.onboardingCompleted,
    billingPreference: consumer?.preferencia_cobranca ?? "UNIFICADA",
    referralCode: consumer?.codigo_indicacao ?? "",
    memberSince: (consumer?.created_at ?? me.createdAt ?? new Date().toISOString()).slice(0, 10)
  };
}

export const remoteAccountService: AccountService = {
  async getProfile() {
    const [me, consumer] = await Promise.all([api.get("auth", "/v1/auth/me", meSchema), fetchConsumer()]);
    return toProfile(me, consumer);
  },

  async updateProfile(update) {
    // Canonical profile (Swagger: PATCH /v1/users/me) — returns the updated /auth/me payload.
    const me = await api.patch("auth", "/v1/users/me", meSchema, { body: { displayName: update.displayName.trim(), phoneNumber: update.phone } });
    // Keep the business consumer record in sync (same as the web portal's profile save).
    const consumer = await fetchConsumer();
    if (consumer) {
      await api.patch("business", `/v1/consumidores/${encodeURIComponent(consumer.id)}`, zIgnoredBody, {
        body: { nome_completo: update.displayName.trim(), celular: update.phone, whatsapp: update.phone }
      });
    }
    return toProfile(me, consumer ? { ...consumer, nome_completo: update.displayName.trim(), celular: update.phone } : null);
  },

  async listDocuments() {
    const consumer = await fetchConsumer();
    if (!consumer) return [];
    const documents = await listConsumerDocuments(consumer.id);
    return documents.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  },

  async uploadDocument(kind, file, onProgress) {
    const consumer = await requireConsumer();
    return uploadConsumerDocument(consumer.id, kind, file, "Documento enviado pelo aplicativo", onProgress);
  },

  getDocumentUrl: (documentId) => documentSignedUrl(documentId),

  async changePassword(currentPassword, newPassword) {
    // 204; wrong current password → 422 INVALID_CURRENT_PASSWORD (mapped to INVALID_CREDENTIALS).
    await api.patch("auth", "/v1/auth/change-password", zIgnoredBody, { body: { current_password: currentPassword, new_password: newPassword } });
    // The backend revokes every refresh token: sign in again with the new password to keep this device.
    await authService.renewSession(newPassword);
  },

  async getDeletionRequest() {
    try {
      return await api.get("auth", "/v1/auth/account/delete-request", deletionSchema);
    } catch (error) {
      if (isAppError(error, "RESOURCE_NOT_FOUND")) return null;
      throw error;
    }
  },

  async requestDeletion({ password }) {
    // The endpoint takes no body: the password is verified with the identity provider first.
    await authService.reauthenticate(password);
    return api.post("auth", "/v1/auth/account/delete-request", deletionSchema);
  },

  async cancelDeletion() {
    await api.delete("auth", "/v1/auth/account/delete-request", zIgnoredBody);
  }
};
