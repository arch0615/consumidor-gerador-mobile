/**
 * Single place mapping domain statuses to user-facing labels and tones.
 * Raw enum values must never be rendered (web issue: "EM_ATENDIMENTO",
 * "CRITICAL", raw residence/contract statuses).
 */
import type {
  AccountStatus,
  ChargeStatus,
  DocumentKind,
  DocumentValidation,
  InvoiceStatus,
  NotificationCategory,
  ResidenceStatus,
  ResidenceType,
  TicketCategory,
  TicketStatus
} from "@/types/domain";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusPresentation {
  label: string;
  tone: StatusTone;
}

export const INVOICE_STATUS: Record<InvoiceStatus, StatusPresentation> = {
  PENDENTE: { label: "Em aberto", tone: "warning" },
  ATRASADO: { label: "Em atraso", tone: "danger" },
  PAGO: { label: "Paga", tone: "success" },
  ARQUIVADO: { label: "Arquivada", tone: "neutral" },
  SEM_COBRANCA_ACVEL: { label: "Sem cobrança ACVEL", tone: "info" }
};

export const CHARGE_STATUS: Record<ChargeStatus, StatusPresentation> = {
  AGUARDANDO: { label: "Aguardando pagamento", tone: "warning" },
  PROCESSANDO: { label: "Gerando cobrança", tone: "info" },
  CONFIRMADO: { label: "Pagamento confirmado", tone: "success" },
  EXPIRADO: { label: "Código expirado", tone: "danger" },
  FALHOU: { label: "Cobrança indisponível", tone: "danger" }
};

export const ACCOUNT_STATUS: Record<AccountStatus, StatusPresentation> = {
  ATIVO: { label: "Conta ativa", tone: "success" },
  EM_ANALISE: { label: "Em análise", tone: "info" },
  PENDENTE: { label: "Pendente", tone: "warning" }
};

const IN_REVIEW = { label: "Em análise", tone: "warning", nextStep: "Nosso time está conferindo os dados da sua conta de luz." } as const;
const REJECTED = { label: "Ajustes necessários", tone: "danger", nextStep: "Corrija os dados indicados e reenvie para análise." } as const;
const APPROVED = { label: "Aprovada", tone: "info", nextStep: "Estamos preparando o seu contrato." } as const;

export const RESIDENCE_STATUS: Record<ResidenceStatus, StatusPresentation & { nextStep: string }> = {
  RASCUNHO: { label: "Rascunho", tone: "neutral", nextStep: "Conclua o cadastro para enviar à análise." },
  RESIDENCIA_CADASTRADA: IN_REVIEW,
  EM_ANALISE: IN_REVIEW,
  EM_ANALISE_ADMIN: IN_REVIEW,
  APROVADA: APPROVED,
  APROVADA_ADMIN: APPROVED,
  REPROVADA: REJECTED,
  REPROVADA_ADMIN: REJECTED,
  CONTRATO_GERADO: { label: "Contrato gerado", tone: "info", nextStep: "Você receberá o link para assinar o contrato." },
  AGUARDANDO_ASSINATURA: { label: "Assinar contrato", tone: "warning", nextStep: "Seu contrato está pronto. Assine para continuar." },
  CONTRATO_ASSINADO: { label: "Contrato assinado", tone: "info", nextStep: "Vamos enviar a solicitação à distribuidora." },
  PRONTA_PARA_CONCESSIONARIA: { label: "Contrato assinado", tone: "info", nextStep: "Vamos enviar a solicitação à distribuidora." },
  ENVIADA_CONCESSIONARIA: { label: "Na distribuidora", tone: "info", nextStep: "Aguardando aprovação da distribuidora." },
  APROVADA_CONCESSIONARIA: { label: "Aprovada pela distribuidora", tone: "info", nextStep: "A compensação começa na próxima leitura." },
  REPROVADA_CONCESSIONARIA: { label: "Recusada pela distribuidora", tone: "danger", nextStep: "Nossa equipe vai entrar em contato para resolver." },
  ATIVA_COMPENSANDO: { label: "Compensando", tone: "success", nextStep: "Você já recebe créditos de energia solar." },
  ATIVA_NAO_COMPENSANDO: { label: "Ativa", tone: "info", nextStep: "A compensação começa na próxima leitura." },
  SUSPENSA: { label: "Suspensa", tone: "danger", nextStep: "Fale com o suporte para regularizar." }
};

/** Pipeline used by the residence status stepper. */
export const RESIDENCE_STEPS = ["Cadastro", "Análise", "Contrato", "Distribuidora", "Compensando"] as const;

export function residenceStepIndex(status: ResidenceStatus): number {
  switch (status) {
    case "RASCUNHO":
      return 0;
    case "RESIDENCIA_CADASTRADA":
    case "EM_ANALISE":
    case "EM_ANALISE_ADMIN":
    case "REPROVADA":
    case "REPROVADA_ADMIN":
      return 1;
    case "APROVADA":
    case "APROVADA_ADMIN":
    case "CONTRATO_GERADO":
    case "AGUARDANDO_ASSINATURA":
      return 2;
    case "CONTRATO_ASSINADO":
    case "PRONTA_PARA_CONCESSIONARIA":
    case "ENVIADA_CONCESSIONARIA":
    case "APROVADA_CONCESSIONARIA":
    case "REPROVADA_CONCESSIONARIA":
      return 3;
    case "ATIVA_COMPENSANDO":
    case "ATIVA_NAO_COMPENSANDO":
    case "SUSPENSA":
      return 4;
  }
}

/** Statuses in which the customer must fix and resubmit the registration. */
export function isResidenceRejected(status: ResidenceStatus): boolean {
  return status === "REPROVADA" || status === "REPROVADA_ADMIN";
}

export const RESIDENCE_TYPE_LABEL: Record<ResidenceType, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
  EMPRESA: "Empresa",
  COMERCIAL: "Comércio",
  INDUSTRIA: "Indústria",
  RURAL: "Rural",
  OUTRO: "Outro"
};

export const TICKET_STATUS: Record<TicketStatus, StatusPresentation> = {
  ABERTO: { label: "Aberto", tone: "info" },
  EM_ATENDIMENTO: { label: "Em atendimento", tone: "warning" },
  AGUARDANDO_CLIENTE: { label: "Aguardando você", tone: "warning" },
  RESOLVIDO: { label: "Resolvido", tone: "success" },
  FECHADO: { label: "Encerrado", tone: "neutral" }
};

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  FATURA: "Fatura",
  PAGAMENTO: "Pagamento",
  ECONOMIA: "Economia",
  CADASTRO: "Cadastro e documentos",
  BENEFICIOS: "Pontos e benefícios",
  OUTROS: "Outros assuntos"
};

export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  FATURAS: "Faturas",
  ECONOMIA: "Economia",
  BENEFICIOS: "Benefícios",
  SUPORTE: "Suporte",
  CADASTRO: "Cadastro",
  SISTEMA: "Sistema"
};

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  RG: "RG",
  CNH: "CNH",
  CNPJ: "Cartão CNPJ",
  CONTA_DE_LUZ: "Conta de luz",
  CONTRATO: "Contrato",
  OUTRO: "Outro documento"
};

export const DOCUMENT_STATUS: Record<DocumentValidation, StatusPresentation> = {
  PENDENTE: { label: "Pendente", tone: "neutral" },
  EM_ANALISE: { label: "Em análise", tone: "info" },
  APROVADO: { label: "Aprovado", tone: "success" },
  REPROVADO: { label: "Reprovado", tone: "danger" }
};
