import type { SupportTicketDetail } from "@/types/domain";
import { daysAgo, hoursAgo } from "./calendar";

export const SUPPORT_CONTACT = {
  whatsapp: "5511900000000",
  phone: "08000000000",
  email: "atendimento@acvel.com.br",
  hours: "Segunda a sexta, das 8h às 18h"
} as const;

export const tickets: SupportTicketDetail[] = [
  {
    id: "tkt_001",
    protocol: "ACV-2026-004812",
    subject: "Leitura do medidor divergente",
    category: "FATURA",
    status: "AGUARDANDO_CLIENTE",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(6),
    lastMessagePreview: "Poderia nos enviar uma foto do visor do medidor?",
    messages: [
      {
        id: "msg_001",
        sender: "CLIENTE",
        body: "Olá! A leitura da minha última conta ficou bem acima do normal. Podem verificar?",
        createdAt: daysAgo(9, 9),
        attachments: [{ documentId: "doc_att_01", name: "conta-enel.pdf", mimeType: "application/pdf", sizeBytes: 482_113 }]
      },
      {
        id: "msg_002",
        sender: "SUPORTE",
        body: "Olá, Mariana! Recebemos sua conta e já abrimos a verificação com a distribuidora.",
        createdAt: daysAgo(8, 15),
        attachments: []
      },
      {
        id: "msg_003",
        sender: "SUPORTE",
        body: "Poderia nos enviar uma foto do visor do medidor? Assim conseguimos comparar com a leitura faturada.",
        createdAt: daysAgo(6, 11),
        attachments: []
      }
    ]
  },
  {
    id: "tkt_002",
    protocol: "ACV-2026-004377",
    subject: "Alterar forma de pagamento",
    category: "PAGAMENTO",
    status: "RESOLVIDO",
    createdAt: daysAgo(40),
    updatedAt: daysAgo(38),
    lastMessagePreview: "Pronto! A partir da próxima fatura você poderá pagar com Pix.",
    messages: [
      { id: "msg_010", sender: "CLIENTE", body: "Gostaria de pagar minhas faturas com Pix em vez de boleto.", createdAt: daysAgo(40, 10), attachments: [] },
      { id: "msg_011", sender: "SUPORTE", body: "Pronto! A partir da próxima fatura você poderá pagar com Pix.", createdAt: daysAgo(38, 14), attachments: [] }
    ]
  },
  {
    id: "tkt_003",
    protocol: "ACV-2026-004950",
    subject: "Dúvida sobre créditos de energia",
    category: "ECONOMIA",
    status: "EM_ATENDIMENTO",
    createdAt: hoursAgo(26),
    updatedAt: hoursAgo(5),
    lastMessagePreview: "Estamos analisando o saldo de créditos da sua unidade.",
    messages: [
      { id: "msg_020", sender: "CLIENTE", body: "Como funciona o saldo de créditos quando eu consumo menos?", createdAt: hoursAgo(26), attachments: [] },
      { id: "msg_021", sender: "SUPORTE", body: "Estamos analisando o saldo de créditos da sua unidade e retornamos em breve.", createdAt: hoursAgo(5), attachments: [] }
    ]
  }
];

export const SUPPORT_FAQ: readonly { question: string; answer: string }[] = [
  { question: "Quando começo a economizar?", answer: "Após a assinatura do contrato e a conexão com a distribuidora, o que costuma levar de 60 a 90 dias." },
  { question: "Preciso instalar alguma coisa?", answer: "Não. A energia é gerada em nossas usinas e os créditos são aplicados na sua conta de luz." },
  { question: "Posso cancelar quando quiser?", answer: "Sim, respeitando o aviso prévio previsto em contrato, sem multa após o período mínimo." }
];
