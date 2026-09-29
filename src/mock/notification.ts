import type { AppNotification, NotificationPreferences } from "@/types/domain";
import { daysAgo, hoursAgo } from "./calendar";
import { invoices } from "./invoice";

const latest = invoices[0];
const previous = invoices[1];

export const notifications: AppNotification[] = [
  {
    id: "ntf_001",
    category: "FATURAS",
    title: "Sua fatura chegou",
    message: "A fatura do último mês já está disponível. Pague com Pix e veja a confirmação na hora.",
    createdAt: hoursAgo(3),
    read: false,
    action: latest ? { type: "INVOICE_DETAILS", resourceId: latest.id } : null
  },
  {
    id: "ntf_002",
    category: "CADASTRO",
    title: "Contrato aguardando assinatura",
    message: "Assine o contrato digital do apartamento na Av. Paulista para iniciar a compensação.",
    createdAt: hoursAgo(20),
    read: false,
    action: { type: "RESIDENCE_DETAILS", resourceId: "res_002" }
  },
  {
    id: "ntf_003",
    category: "ECONOMIA",
    title: "Você economizou mais este mês",
    message: "Sua economia ficou acima da média dos últimos 3 meses. Confira o detalhamento.",
    createdAt: daysAgo(2),
    read: false,
    action: { type: "ECONOMY" }
  },
  {
    id: "ntf_004",
    category: "FATURAS",
    title: "Fatura em aberto",
    message: "Existe uma fatura anterior aguardando pagamento. Evite juros pagando pelo app.",
    createdAt: daysAgo(4),
    read: true,
    action: previous ? { type: "INVOICE_PAYMENT", resourceId: previous.id } : null
  },
  {
    id: "ntf_005",
    category: "SUPORTE",
    title: "Seu chamado foi respondido",
    message: "A equipe ACVEL respondeu ao chamado sobre a leitura do medidor.",
    createdAt: daysAgo(6),
    read: true,
    action: { type: "SUPPORT_TICKET", resourceId: "tkt_001" }
  },
  {
    id: "ntf_006",
    category: "BENEFICIOS",
    title: "Você ganhou 250 pontos",
    message: "Sua indicação foi aprovada. Use os pontos para trocar por recompensas.",
    createdAt: daysAgo(12),
    read: true,
    action: { type: "BENEFITS" }
  },
  {
    id: "ntf_007",
    category: "SISTEMA",
    title: "Novidade no app",
    message: "Agora você pode enviar a conta de luz pela câmera do celular.",
    createdAt: daysAgo(25),
    read: true,
    action: null
  }
];

export const notificationPreferences: NotificationPreferences = {
  push: true,
  email: true,
  whatsapp: true,
  sms: false,
  marketing: false
};
