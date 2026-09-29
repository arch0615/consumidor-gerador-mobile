import { accountDocuments } from "@/mock/documents";
import type { AccountDeletionRequest, AccountDocument } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import type { AccountService } from "../account.service";
import { currentMockAccount } from "./auth.mock";
import { mockId, mockMutation, mockQuery, mockUpload } from "./mock-request";

const SAMPLE_DOCUMENT_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
let deletionRequest: AccountDeletionRequest | null = null;

export const mockAccountService: AccountService = {
  getProfile: () => mockQuery(() => currentMockAccount().profile),

  updateProfile: (update) =>
    mockMutation(() => {
      const account = currentMockAccount();
      const displayName = update.displayName.trim();
      account.profile = { ...account.profile, displayName, firstName: displayName.split(/\s+/)[0] ?? displayName, phone: `+55${update.phone}` };
      return account.profile;
    }),

  listDocuments: () => mockQuery(() => [...accountDocuments].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)), () => []),

  async uploadDocument(kind, file, onProgress) {
    await mockUpload(onProgress);
    const document: AccountDocument = { id: mockId("doc"), kind, name: file.name, status: "EM_ANALISE", rejectionReason: null, uploadedAt: new Date().toISOString() };
    accountDocuments.unshift(document);
    return document;
  },

  getDocumentUrl: () => mockMutation(() => SAMPLE_DOCUMENT_URL),

  changePassword: (currentPassword, newPassword) =>
    mockMutation(() => {
      const account = currentMockAccount();
      if (account.password !== currentPassword) throw new AppError("INVALID_CREDENTIALS", "Senha atual incorreta.");
      account.password = newPassword;
    }),

  getDeletionRequest: () => mockQuery(() => deletionRequest),

  requestDeletion: ({ password }) =>
    mockMutation(() => {
      if (currentMockAccount().password !== password) throw new AppError("INVALID_CREDENTIALS", "Senha incorreta.");
      deletionRequest = deletionRequest ?? { id: mockId("del"), status: "REQUESTED", requestedAt: new Date().toISOString() };
      return deletionRequest;
    }),

  cancelDeletion: () =>
    mockMutation(() => {
      if (!deletionRequest) throw new AppError("RESOURCE_NOT_FOUND", "Nenhuma solicitação de exclusão em aberto.");
      deletionRequest = null;
    })
};
