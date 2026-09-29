import { config } from "@/config/env";
import type { LocalFile, NewTicketInput, SupportTicket, SupportTicketDetail, UploadedDocument } from "@/types/domain";
import { mockSupportService } from "./mock/support.mock";
import { remoteSupportService } from "./remote/support.remote";

/** Contact channels + FAQ. Channels the backend does not provide are null (hidden). */
export interface HelpCenter {
  contact: { whatsapp: string | null; phone: string | null; email: string | null; hours: string | null };
  faq: readonly { question: string; answer: string }[];
}

export interface SupportCapabilities {
  /** The ticket API accepts file attachments. */
  attachments: boolean;
}

/**
 * Support tickets.
 * API (business): GET|POST /v1/support/tickets, GET /v1/support/tickets/{id},
 * GET|POST /v1/support/tickets/{id}/messages, GET /v1/client-configuracoes/whatsapp-atendimento.
 * The ticket API has no attachment support yet (see `capabilities`).
 */
export interface SupportService {
  readonly capabilities: SupportCapabilities;
  getHelpCenter(): Promise<HelpCenter>;
  list(): Promise<SupportTicket[]>;
  get(ticketId: string): Promise<SupportTicketDetail>;
  create(input: NewTicketInput): Promise<SupportTicketDetail>;
  sendMessage(ticketId: string, body: string, attachments: readonly UploadedDocument[]): Promise<SupportTicketDetail>;
  uploadAttachment(file: LocalFile, onProgress: (progress: number) => void): Promise<UploadedDocument>;
}

export const supportService: SupportService = config.useMocks ? mockSupportService : remoteSupportService;
