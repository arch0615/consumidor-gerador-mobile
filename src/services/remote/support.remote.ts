import { z } from "zod";
import { SUPPORT_FAQ } from "@/config/support-content";
import type { SupportTicket, SupportTicketDetail, TicketCategory, TicketMessage, TicketStatus, UploadedDocument } from "@/types/domain";
import { AppError, isAppError } from "@/utils/app-error";
import { onlyDigits } from "@/utils/format";
import { api } from "../api/apiClient";
import { zId, zIgnoredBody, zList, zNumberOrNull, zStringOrNull } from "../api/schema";
import type { SupportService } from "../support.service";

// ── Vocabulary mapping (backend ↔ app) ────────────────────────────────

const STATUS_MAP: Readonly<Record<string, TicketStatus>> = {
  ABERTO: "ABERTO",
  OPEN: "ABERTO",
  EM_ATENDIMENTO: "EM_ATENDIMENTO",
  IN_PROGRESS: "EM_ATENDIMENTO",
  AGUARDANDO: "AGUARDANDO_CLIENTE",
  AGUARDANDO_CLIENTE: "AGUARDANDO_CLIENTE",
  AGUARDANDO_USUARIO: "AGUARDANDO_CLIENTE",
  RESOLVIDO: "RESOLVIDO",
  RESOLVED: "RESOLVIDO",
  FECHADO: "FECHADO",
  CLOSED: "FECHADO"
};

const CATEGORY_FROM_API: Readonly<Record<string, TicketCategory>> = {
  MINHA_FATURA: "FATURA",
  FATURA: "FATURA",
  PAGAMENTO: "PAGAMENTO",
  ECONOMIA: "ECONOMIA",
  PONTOS_MARKETPLACE: "BENEFICIOS",
  CADASTRO_DOCUMENTOS: "CADASTRO"
};

/** The API has no generic "other" category; "Outros" is filed as registration/documents (same as the web portal). */
const CATEGORY_TO_API: Record<TicketCategory, string> = {
  FATURA: "MINHA_FATURA",
  PAGAMENTO: "PAGAMENTO",
  ECONOMIA: "ECONOMIA",
  BENEFICIOS: "PONTOS_MARKETPLACE",
  CADASTRO: "CADASTRO_DOCUMENTOS",
  OUTROS: "CADASTRO_DOCUMENTOS"
};

// ── Payloads ───────────────────────────────────────────────────────────

const ticketSchema = z
  .object({
    id: zId,
    subject: zStringOrNull,
    assunto: zStringOrNull,
    category: zStringOrNull,
    categoria: zStringOrNull,
    status: z.string().default("ABERTO"),
    protocolo: zStringOrNull,
    protocol: zStringOrNull,
    numero: z.union([z.string(), z.number()]).nullish(),
    created_at: zStringOrNull,
    createdAt: zStringOrNull,
    updated_at: zStringOrNull,
    updatedAt: zStringOrNull,
    last_message: zStringOrNull,
    ultima_mensagem: zStringOrNull
  })
  .transform((ticket): SupportTicket => {
    const createdAt = ticket.created_at ?? ticket.createdAt ?? new Date(0).toISOString();
    return {
      id: ticket.id,
      protocol: ticket.protocolo ?? ticket.protocol ?? (ticket.numero !== null && ticket.numero !== undefined ? String(ticket.numero) : null),
      subject: ticket.subject ?? ticket.assunto ?? "Chamado",
      category: CATEGORY_FROM_API[(ticket.category ?? ticket.categoria ?? "").toUpperCase()] ?? "OUTROS",
      status: STATUS_MAP[ticket.status.toUpperCase()] ?? "ABERTO",
      createdAt,
      updatedAt: ticket.updated_at ?? ticket.updatedAt ?? createdAt,
      lastMessagePreview: ticket.last_message ?? ticket.ultima_mensagem ?? null
    };
  });

const attachmentSchema = z.object({
  id: zId,
  nome: zStringOrNull,
  name: zStringOrNull,
  mime_type: zStringOrNull,
  tamanho: zNumberOrNull
});

const messageSchema = z
  .object({
    id: zId,
    sender: zStringOrNull,
    text: zStringOrNull,
    conteudo: zStringOrNull,
    message: zStringOrNull,
    sent_at: zStringOrNull,
    created_at: zStringOrNull,
    attachments: z.array(attachmentSchema).catch([]).default([])
  })
  .transform(
    (message): TicketMessage => ({
      id: message.id,
      sender: message.sender === "AGENT" || message.sender === "BOT" || message.sender === "SUPORTE" ? "SUPORTE" : "CLIENTE",
      body: message.text ?? message.conteudo ?? message.message ?? "",
      createdAt: message.sent_at ?? message.created_at ?? new Date(0).toISOString(),
      attachments: message.attachments.map(
        (attachment): UploadedDocument => ({ documentId: attachment.id, name: attachment.nome ?? attachment.name ?? "Anexo", mimeType: attachment.mime_type ?? "application/octet-stream", sizeBytes: attachment.tamanho ?? 0 })
      )
    })
  );

const whatsappSchema = z.object({ phoneE164: zStringOrNull });

async function fetchTicketDetail(ticketId: string): Promise<SupportTicketDetail> {
  const id = encodeURIComponent(ticketId);
  const [ticket, messages] = await Promise.all([
    api.get("business", `/v1/support/tickets/${id}`, ticketSchema),
    api.get("business", `/v1/support/tickets/${id}/messages`, zList(messageSchema))
  ]);
  const ordered = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { ...ticket, lastMessagePreview: ordered.at(-1)?.body ?? ticket.lastMessagePreview, messages: ordered };
}

export const remoteSupportService: SupportService = {
  capabilities: { attachments: false },

  async getHelpCenter() {
    let whatsapp: string | null = null;
    try {
      const config = await api.get("business", "/v1/client-configuracoes/whatsapp-atendimento", whatsappSchema);
      whatsapp = config.phoneE164 ? onlyDigits(config.phoneE164) || null : null;
    } catch (error) {
      if (!isAppError(error, "RESOURCE_NOT_FOUND")) throw error;
    }
    return { contact: { whatsapp, phone: null, email: null, hours: null }, faq: SUPPORT_FAQ };
  },

  async list() {
    const tickets = await api.get("business", "/v1/support/tickets", zList(ticketSchema));
    return tickets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get: fetchTicketDetail,

  async create(input) {
    const ticket = await api.post("business", "/v1/support/tickets", ticketSchema, {
      body: { category: CATEGORY_TO_API[input.category], subject: input.subject, initialMessage: input.message }
    });
    return fetchTicketDetail(ticket.id);
  },

  async sendMessage(ticketId, body) {
    await api.post("business", `/v1/support/tickets/${encodeURIComponent(ticketId)}/messages`, zIgnoredBody, { body: { text: body } });
    return fetchTicketDetail(ticketId);
  },

  uploadAttachment: () => Promise.reject(new AppError("NOT_SUPPORTED", "O envio de anexos em chamados ainda não está disponível."))
};
