import { SUPPORT_CONTACT, SUPPORT_FAQ, tickets } from "@/mock/support";
import type { SupportTicket, SupportTicketDetail, UploadedDocument } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import type { SupportService } from "../support.service";
import { mockId, mockMutation, mockQuery, mockUpload } from "./mock-request";

const uploadedAttachments = new Map<string, UploadedDocument>();

function findTicket(ticketId: string): SupportTicketDetail {
  const ticket = tickets.find((candidate) => candidate.id === ticketId);
  if (!ticket) throw new AppError("RESOURCE_NOT_FOUND", "Chamado não encontrado.");
  return ticket;
}

function toSummary({ messages: _messages, ...summary }: SupportTicketDetail): SupportTicket {
  return summary;
}

function nextProtocol(): string {
  return `ACV-${new Date().getFullYear()}-${String(5000 + tickets.length).padStart(6, "0")}`;
}

export const mockSupportService: SupportService = {
  capabilities: { attachments: true },

  getHelpCenter: () => mockQuery(() => ({ contact: SUPPORT_CONTACT, faq: SUPPORT_FAQ })),

  list: () => mockQuery(() => [...tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(toSummary), () => []),

  get: (ticketId) => mockQuery(() => findTicket(ticketId)),

  create: (input) =>
    mockMutation(() => {
      const now = new Date().toISOString();
      const attachments = input.attachmentIds.map((id) => uploadedAttachments.get(id)).filter((doc): doc is UploadedDocument => doc !== undefined);
      const ticket: SupportTicketDetail = {
        id: mockId("tkt"),
        protocol: nextProtocol(),
        subject: input.subject,
        category: input.category,
        status: "ABERTO",
        createdAt: now,
        updatedAt: now,
        lastMessagePreview: input.message,
        messages: [{ id: mockId("msg"), sender: "CLIENTE", body: input.message, createdAt: now, attachments }]
      };
      tickets.unshift(ticket);
      return ticket;
    }),

  sendMessage: (ticketId, body, attachments) =>
    mockMutation(() => {
      const ticket = findTicket(ticketId);
      if (ticket.status === "FECHADO") throw new AppError("BUSINESS_RULE_VIOLATION", "Este chamado foi encerrado. Abra um novo chamado.");
      const now = new Date().toISOString();
      ticket.messages = [...ticket.messages, { id: mockId("msg"), sender: "CLIENTE", body, createdAt: now, attachments: [...attachments] }];
      ticket.updatedAt = now;
      ticket.lastMessagePreview = body;
      if (ticket.status === "AGUARDANDO_CLIENTE" || ticket.status === "RESOLVIDO") ticket.status = "EM_ATENDIMENTO";
      return ticket;
    }),

  async uploadAttachment(file, onProgress) {
    await mockUpload(onProgress);
    const document: UploadedDocument = { documentId: mockId("att"), name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes };
    uploadedAttachments.set(document.documentId, document);
    return document;
  }
};
