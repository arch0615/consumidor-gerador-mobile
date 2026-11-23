import { z } from "zod";
import type { InvoiceStatus } from "@/types/domain";
import { AppError, isAppError } from "@/utils/app-error";
import { businessToday } from "@/utils/format";
import { api } from "../api/apiClient";
import { zId, zNumber, zNumberOrNull, zStringOrNull } from "../api/schema";

// ── GET /v1/consumidores/me (business) ────────────────────────────────

export const consumerSchema = z.object({
  id: zId,
  nome_completo: zStringOrNull,
  razao_social: zStringOrNull,
  tipo_pessoa: z.enum(["FISICA", "JURIDICA"]).nullish(),
  cpf_cnpj: zStringOrNull,
  cpf: zStringOrNull,
  cnpj: zStringOrNull,
  email: zStringOrNull,
  celular: zStringOrNull,
  whatsapp: zStringOrNull,
  telefone: zStringOrNull,
  codigo_indicacao: zStringOrNull,
  dg_status: zStringOrNull,
  status: zStringOrNull,
  compensando: z.boolean().nullish(),
  aprovado_em: zStringOrNull,
  is_generator: z.boolean().nullish(),
  preferencia_cobranca: z.enum(["UNIFICADA", "SEPARADA"]).nullish(),
  created_at: zStringOrNull
});

export type Consumer = z.output<typeof consumerSchema>;

/** The caller's consumer record; null when the user has no consumer profile yet (404). */
export async function fetchConsumer(): Promise<Consumer | null> {
  try {
    return await api.get("business", "/v1/consumidores/me", consumerSchema);
  } catch (error) {
    if (isAppError(error, "RESOURCE_NOT_FOUND")) return null;
    throw error;
  }
}

/**
 * Effective onboarding state. The legacy auth-api may keep `onboarding_completed=false` for consumers
 * that were already approved; like the web portal (splash + hydrateConsumerIdentity), an approved
 * consumer — or one already receiving credits — has finished onboarding.
 */
export function isConsumerOnboarded(consumer: Consumer | null): boolean {
  if (!consumer) return false;
  return (consumer.status ?? "").toUpperCase() === "APROVADO" || Boolean(consumer.aprovado_em) || consumer.compensando === true;
}

export async function requireConsumer(): Promise<Consumer> {
  const consumer = await fetchConsumer();
  if (!consumer) throw new AppError("BUSINESS_RULE_VIOLATION", "Conclua seu cadastro de cliente no portal ACVEL para usar este recurso.");
  return consumer;
}

// ── GET /v1/consumidores/me/rateio-snapshot (business) ────────────────

const snapshotUcSchema = z.object({
  id: zId,
  numero: z.string(),
  titular: zStringOrNull,
  cpf_cnpj_titular: zStringOrNull,
  status: z.string().default(""),
  compensando: z.boolean().default(false),
  concessionaria: zStringOrNull,
  cidade: zStringOrNull,
  uf: zStringOrNull,
  classe: zStringOrNull
});

const snapshotInvoiceSchema = z.object({
  id: zId,
  uc_id: zStringOrNull,
  numero_uc: zStringOrNull,
  competencia: zStringOrNull,
  status: z.string().default(""),
  payment_status: zStringOrNull,
  vencimento: zStringOrNull,
  paga_em: zStringOrNull,
  valor_total: zNumber.default(0),
  valor_distribuidora: zNumberOrNull,
  economia_reais: zNumber.default(0),
  consumo_kwh: zNumber.default(0),
  energia_compensada_kwh: zNumberOrNull,
  metodo_pagamento: zStringOrNull,
  origem: zStringOrNull,
  pdf_url: zStringOrNull
});

const snapshotMonthSchema = z.object({
  competencia: z.string(),
  valor_total: zNumber.default(0),
  valor_distribuidora: zNumber.default(0),
  economia_reais: zNumber.default(0),
  consumo_kwh: zNumber.default(0),
  energia_injetada_kwh: zNumber.default(0),
  energia_compensada_kwh: zNumber.default(0),
  total_sem_acvel: zNumberOrNull,
  total_com_acvel: zNumberOrNull,
  fonte: zStringOrNull
});

/**
 * "Sem ACVEL" baseline of a month. The billing engine value is preferred (web portal rule), but a
 * missing or non-positive value is not a usable baseline (the engine answers 0 when it has no
 * result), so the legacy approximation distribuidora + ACVEL + economia is used instead.
 */
export function baselineWithoutAcvel(month: Pick<SnapshotMonth, "total_sem_acvel" | "valor_distribuidora" | "valor_total" | "economia_reais">): number {
  if (month.total_sem_acvel !== null && month.total_sem_acvel > 0) return month.total_sem_acvel;
  return month.valor_distribuidora + month.valor_total + month.economia_reais;
}

/** ACVEL invoice PDFs are served by Rateio at /v1/faturas/{id}/pdf (Digital Grid bills are not readable by consumers). */
export function hasAcvelInvoicePdf(invoice: Pick<SnapshotInvoice, "id" | "origem" | "pdf_url">): boolean {
  const origin = (invoice.origem ?? "ACVEL").toUpperCase();
  return origin === "ACVEL" && invoice.pdf_url === `/v1/faturas/${invoice.id}/pdf`;
}

export const snapshotSchema = z.object({
  consumidor_id: zStringOrNull,
  ucs: z.array(snapshotUcSchema).default([]),
  invoices: z.array(snapshotInvoiceSchema).default([]),
  summary: z
    .object({
      total_ucs: zNumber.default(0),
      total_economia_reais: zNumber.default(0),
      total_consumo_kwh: zNumber.default(0),
      total_energia_injetada_kwh: zNumberOrNull,
      total_energia_compensada_kwh: zNumberOrNull,
      por_competencia: z.array(snapshotMonthSchema).default([])
    })
    .default({ total_ucs: 0, total_economia_reais: 0, total_consumo_kwh: 0, total_energia_injetada_kwh: null, total_energia_compensada_kwh: null, por_competencia: [] })
});

export type Snapshot = z.output<typeof snapshotSchema>;
export type SnapshotUc = Snapshot["ucs"][number];
export type SnapshotInvoice = Snapshot["invoices"][number];
export type SnapshotMonth = Snapshot["summary"]["por_competencia"][number];

const EMPTY_SNAPSHOT: Snapshot = {
  consumidor_id: null,
  ucs: [],
  invoices: [],
  summary: { total_ucs: 0, total_economia_reais: 0, total_consumo_kwh: 0, total_energia_injetada_kwh: null, total_energia_compensada_kwh: null, por_competencia: [] }
};

/** Operational billing snapshot; consumers without billing data get an empty snapshot (404). */
export async function fetchSnapshot(): Promise<Snapshot> {
  try {
    return await api.get("business", "/v1/consumidores/me/rateio-snapshot", snapshotSchema);
  } catch (error) {
    if (isAppError(error, "RESOURCE_NOT_FOUND")) return EMPTY_SNAPSHOT;
    throw error;
  }
}

/** Invoice status from snapshot/rateio vocabularies (same rules as the web portal). */
export function normaliseInvoiceStatus(rawStatus: string | null, dueDate: string | null): InvoiceStatus {
  const raw = (rawStatus ?? "").toUpperCase();
  if (raw === "SEM_COBRANCA_ACVEL") return "SEM_COBRANCA_ACVEL";
  if (["PAGO", "PAID", "PAGA"].includes(raw)) return "PAGO";
  if (["ARQUIVADO", "ARCHIVED", "CANCELADA", "CANCELADO", "ESTORNADA", "ESTORNADO", "A_COMPENSAR", "COMPENSADA"].includes(raw)) return "ARQUIVADO";
  if (["VENCIDA", "ATRASADO", "ATRASADA"].includes(raw)) return "ATRASADO";
  const due = dueDate?.slice(0, 10) ?? null;
  return due && due < businessToday() ? "ATRASADO" : "PENDENTE";
}

export function snapshotInvoiceStatus(invoice: SnapshotInvoice): InvoiceStatus {
  return normaliseInvoiceStatus(invoice.payment_status ?? invoice.status, invoice.vencimento);
}

/** Competência "YYYY-MM" from "YYYY-MM[-DD]" or "MM/YYYY". */
export function normaliseCompetencia(value: string | null): string {
  if (!value) return "";
  const iso = /^(\d{4})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const br = /^(\d{2})\/(\d{4})/.exec(value);
  return br ? `${br[2]}-${br[1]}` : value;
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
