import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { accountService, type ProfileUpdate } from "@/services/account.service";
import { queryKeys } from "@/services/query-keys";
import { useAuthStore } from "@/stores/auth.store";
import type { DocumentKind, LocalFile } from "@/types/domain";

export function useProfile() {
  return useQuery({ queryKey: queryKeys.profile, queryFn: () => accountService.getProfile(), staleTime: 5 * 60_000 });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: ProfileUpdate) => accountService.updateProfile(update),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    }
  });
}

export function useDocuments() {
  return useQuery({ queryKey: queryKeys.documents, queryFn: () => accountService.listDocuments() });
}

/** Upload function bound to a document kind (for useUpload). */
export function uploadAccountDocument(kind: DocumentKind) {
  return (file: LocalFile, onProgress: (progress: number) => void) => accountService.uploadDocument(kind, file, onProgress);
}

/** Opens a document through a short-lived signed URL in the in-app browser. */
export function useOpenDocument() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const url = await accountService.getDocumentUrl(documentId);
      await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
    }
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => accountService.changePassword(currentPassword, newPassword)
  });
}

export function useDeletionRequest() {
  return useQuery({ queryKey: queryKeys.deletionRequest, queryFn: () => accountService.getDeletionRequest() });
}

/** LGPD deletion request; on success the session ends on this device. */
export function useDeleteAccount() {
  const endSession = useAuthStore((state) => state.endSession);
  return useMutation({
    mutationFn: (input: { password: string }) => accountService.requestDeletion(input),
    onSuccess: () =>
      endSession({
        tone: "info",
        title: "Solicitação de exclusão registrada",
        message: "Sua conta será excluída conforme a LGPD. Para desistir, entre novamente e cancele em Conta → Excluir conta."
      })
  });
}

export function useCancelDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => accountService.cancelDeletion(),
    onSuccess: () => queryClient.setQueryData(queryKeys.deletionRequest, null)
  });
}
