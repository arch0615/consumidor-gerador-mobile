import { config } from "@/config/env";
import type { AccountDeletionRequest, AccountDocument, DocumentKind, LocalFile, UserProfile } from "@/types/domain";
import { mockAccountService } from "./mock/account.mock";
import { remoteAccountService } from "./remote/account.remote";

export interface ProfileUpdate {
  displayName: string;
  phone: string; // digits (DDD + number)
}

/**
 * Profile, documents, security and account deletion.
 * API (auth): GET /v1/auth/me, PATCH /v1/users/me, PATCH /v1/auth/change-password,
 *   POST|GET|DELETE /v1/auth/account/delete-request.
 * API (business): GET /v1/consumidores/me, PATCH /v1/consumidores/{id}, GET /v1/documentos,
 *   POST /v1/documentos/presign-upload + confirm-upload, GET /v1/documentos/{id}/signed-url.
 */
export interface AccountService {
  getProfile(): Promise<UserProfile>;
  updateProfile(update: ProfileUpdate): Promise<UserProfile>;
  listDocuments(): Promise<AccountDocument[]>;
  uploadDocument(kind: DocumentKind, file: LocalFile, onProgress: (progress: number) => void): Promise<AccountDocument>;
  /** Short-lived URL to view/download a document. */
  getDocumentUrl(documentId: string): Promise<string>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  getDeletionRequest(): Promise<AccountDeletionRequest | null>;
  /** Confirms the password, then opens an LGPD deletion request. */
  requestDeletion(input: { password: string }): Promise<AccountDeletionRequest>;
  cancelDeletion(): Promise<void>;
}

export const accountService: AccountService = config.useMocks ? mockAccountService : remoteAccountService;
