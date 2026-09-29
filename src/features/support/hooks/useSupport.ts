import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/query-keys";
import { supportService } from "@/services/support.service";
import type { NewTicketInput, UploadedDocument } from "@/types/domain";

export function useTickets() {
  return useQuery({ queryKey: queryKeys.support.all, queryFn: () => supportService.list() });
}

export function useTicket(ticketId: string) {
  return useQuery({ queryKey: queryKeys.support.detail(ticketId), queryFn: () => supportService.get(ticketId) });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTicketInput) => supportService.create(input),
    onSuccess: (ticket) => {
      queryClient.setQueryData(queryKeys.support.detail(ticket.id), ticket);
      void queryClient.invalidateQueries({ queryKey: queryKeys.support.all, exact: true });
    }
  });
}

export function useSendTicketMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, attachments }: { body: string; attachments: readonly UploadedDocument[] }) => supportService.sendMessage(ticketId, body, attachments),
    onSuccess: (ticket) => {
      queryClient.setQueryData(queryKeys.support.detail(ticketId), ticket);
      void queryClient.invalidateQueries({ queryKey: queryKeys.support.all, exact: true });
    }
  });
}

export const uploadSupportAttachment = supportService.uploadAttachment;

export function useHelpCenter() {
  return useQuery({ queryKey: queryKeys.support.helpCenter, queryFn: () => supportService.getHelpCenter(), staleTime: 24 * 60 * 60_000 });
}

/** What the connected support API supports (e.g. attachments). */
export const supportCapabilities = supportService.capabilities;
