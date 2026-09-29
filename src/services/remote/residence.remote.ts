import { z } from "zod";
import { config } from "@/config/env";
import type { BillExtraction, BillingMode, NewResidenceInput, Residence, ResidenceStatus, ResidenceType, Utility } from "@/types/domain";
import { AppError, isAppError } from "@/utils/app-error";
import { onlyDigits } from "@/utils/format";
import { api, externalGet } from "../api/apiClient";
import { uploadMultipart } from "../api/file-transfer";
import { zId, zList, zNumberOrNull, zStringOrEmpty, zStringOrNull } from "../api/schema";
import type { ResidenceService } from "../residence.service";
import { fetchConsumer, fetchSnapshot, requireConsumer, type Snapshot, type SnapshotUc } from "./business";
import { uploadConsumerDocument } from "./documents";

const RESIDENCE_TYPES = ["CASA", "APARTAMENTO", "EMPRESA", "COMERCIAL", "INDUSTRIA", "RURAL", "OUTRO"] as const satisfies readonly ResidenceType[];
const RESIDENCE_STATUSES = [
  "RASCUNHO",
  "RESIDENCIA_CADASTRADA",
  "EM_ANALISE",
  "EM_ANALISE_ADMIN",
  "APROVADA",
  "APROVADA_ADMIN",
  "REPROVADA",
  "REPROVADA_ADMIN",
  "CONTRATO_GERADO",
  "AGUARDANDO_ASSINATURA",
  "CONTRATO_ASSINADO",
  "PRONTA_PARA_CONCESSIONARIA",
  "ENVIADA_CONCESSIONARIA",
  "APROVADA_CONCESSIONARIA",
  "REPROVADA_CONCESSIONARIA",
  "ATIVA_COMPENSANDO",
  "ATIVA_NAO_COMPENSANDO",
  "SUSPENSA"
] as const satisfies readonly ResidenceStatus[];

const DG_PENDING_LINK_MESSAGE = "Encontramos seus dados na base operacional. Aguarde a validação e importação pelo administrativo antes de cadastrar uma conta de luz.";

// ── Business registrations: /v1/consumidores/me/ucs ───────────────────

const businessUcSchema = z.object({
  id: zId,
  tipo_residencia: z.enum(RESIDENCE_TYPES).catch("OUTRO"),
  numero_uc: z.string(),
  concessionaria: zStringOrEmpty,
  titular: zStringOrEmpty,
  cpf_cnpj_titular: zStringOrEmpty,
  cep: zStringOrEmpty,
  logradouro: zStringOrEmpty,
  numero_endereco: zStringOrEmpty,
  complemento: zStringOrNull,
  bairro: zStringOrEmpty,
  cidade: zStringOrEmpty,
  uf: zStringOrEmpty,
  consumo_medio_kwh: zNumberOrNull,
  status: z.enum(RESIDENCE_STATUSES).catch("EM_ANALISE_ADMIN"),
  created_at: zStringOrNull,
  motivo_reprovacao: zStringOrNull,
  uc_rateio_id: zStringOrNull,
  contrato: z.object({ signing_url: zStringOrNull, signingUrl: zStringOrNull }).nullish()
});

type BusinessUc = z.output<typeof businessUcSchema>;

const minhaUcSchema = z.object({ id: zId, numero: zStringOrEmpty, modo_cobranca: z.enum(["UNIFICADA", "SEPARADA"]).catch("UNIFICADA") });
const utilitySchema = z.object({ sigla: z.string().trim().min(1), nome: z.string().trim().min(1) });

function normaliseUc(value: string): string {
  return onlyDigits(value) || value.trim().toUpperCase();
}

function fromBusiness(uc: BusinessUc, utilityNames: ReadonlyMap<string, string>, modes: ReadonlyMap<string, BillingMode>): Residence {
  const signingUrl = uc.contrato?.signing_url ?? uc.contrato?.signingUrl ?? null;
  return {
    id: uc.id,
    type: uc.tipo_residencia,
    ucNumber: uc.numero_uc,
    utility: utilityNames.get(uc.concessionaria) ?? uc.concessionaria,
    utilityCode: uc.concessionaria || null,
    holderName: uc.titular,
    holderDocument: onlyDigits(uc.cpf_cnpj_titular),
    address: { cep: onlyDigits(uc.cep), street: uc.logradouro, number: uc.numero_endereco, complement: uc.complemento, district: uc.bairro, city: uc.cidade, uf: uc.uf },
    status: uc.status,
    submittedAt: uc.created_at ?? new Date(0).toISOString(),
    averageConsumptionKwh: uc.consumo_medio_kwh,
    billingMode: (uc.uc_rateio_id && modes.get(uc.uc_rateio_id)) || null,
    rejectionReason: uc.motivo_reprovacao,
    contractSigningUrl: signingUrl && /^https:\/\//.test(signingUrl) ? signingUrl : null,
    editable: true
  };
}

/** Operational unit imported from billing (no registration/address in the business API). */
function fromSnapshot(uc: SnapshotUc, modes: ReadonlyMap<string, BillingMode>): Residence {
  return {
    id: uc.id,
    type: (uc.classe ?? "").toLowerCase().includes("rural") ? "RURAL" : "OUTRO",
    ucNumber: uc.numero,
    utility: uc.concessionaria ?? "",
    utilityCode: null,
    holderName: uc.titular ?? "",
    holderDocument: onlyDigits(uc.cpf_cnpj_titular ?? ""),
    address: { cep: "", street: "", number: "", complement: null, district: "", city: uc.cidade ?? "", uf: uc.uf ?? "" },
    status: uc.compensando ? "ATIVA_COMPENSANDO" : "ATIVA_NAO_COMPENSANDO",
    submittedAt: new Date(0).toISOString(),
    averageConsumptionKwh: null,
    billingMode: modes.get(uc.id) ?? null,
    rejectionReason: null,
    contractSigningUrl: null,
    editable: false
  };
}

function valueOf<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

async function fetchBusinessUcs(): Promise<BusinessUc[]> {
  try {
    return await api.get("business", "/v1/consumidores/me/ucs", zList(businessUcSchema));
  } catch (error) {
    if (isAppError(error, "RESOURCE_NOT_FOUND")) return [];
    throw error;
  }
}

/** Registrations merged with billing units; pass an in-flight snapshot to avoid fetching it twice. */
export async function loadResidences(snapshot: Promise<Snapshot> = fetchSnapshot()): Promise<Residence[]> {
  const [businessResult, snapshotResult, modesResult, utilitiesResult] = await Promise.allSettled([
    fetchBusinessUcs(),
    snapshot,
    api.get("rateio", "/v1/ucs/minhas-ucs", zList(minhaUcSchema)),
    api.get("business", "/v1/concessionarias", zList(utilitySchema))
  ]);
  if (businessResult.status === "rejected" && snapshotResult.status === "rejected") throw businessResult.reason;

  const modes = new Map(valueOf(modesResult, []).map((uc) => [uc.id, uc.modo_cobranca] as const));
  const utilityNames = new Map(valueOf(utilitiesResult, []).map((utility) => [utility.sigla, utility.nome] as const));
  const byUc = new Map<string, Residence>();

  for (const uc of valueOf(businessResult, [])) byUc.set(normaliseUc(uc.numero_uc), fromBusiness(uc, utilityNames, modes));
  for (const uc of valueOf(snapshotResult, null)?.ucs ?? []) {
    const key = normaliseUc(uc.numero);
    const registered = byUc.get(key);
    if (!registered) {
      byUc.set(key, fromSnapshot(uc, modes));
      continue;
    }
    // Billing is the source of truth for "is it compensating"; the registration keeps the details.
    byUc.set(key, {
      ...registered,
      status: uc.compensando ? "ATIVA_COMPENSANDO" : registered.status === "ATIVA_COMPENSANDO" ? "ATIVA_NAO_COMPENSANDO" : registered.status,
      billingMode: registered.billingMode ?? modes.get(uc.id) ?? null
    });
  }
  return [...byUc.values()];
}

// ── OCR: POST /v1/fatura-ocr/processar (multipart `arquivo`) ──────────

const OCR_FIELD_MAP: Readonly<Record<string, string>> = {
  nome_titular: "holderName",
  cpf_cnpj: "holderDocument",
  numero_instalacao: "ucNumber",
  distribuidora_sigla: "utilityCode",
  distribuidora: "utilityCode",
  cep: "cep",
  logradouro: "street",
  numero_endereco: "addressNumber",
  bairro: "district",
  cidade: "city",
  uf: "uf"
};

const ocrSchema = z
  .object({
    dados_extraidos: z.object({
      nome_titular: zStringOrNull,
      cpf_cnpj: zStringOrNull,
      numero_instalacao: zStringOrNull,
      distribuidora_sigla: zStringOrNull,
      classe_consumo: zStringOrNull,
      cep: zStringOrNull,
      logradouro: zStringOrNull,
      numero_endereco: zStringOrNull,
      bairro: zStringOrNull,
      cidade: zStringOrNull,
      uf: zStringOrNull,
      historico_consumo: z.array(z.object({ mes: z.string(), consumo_kwh: zNumberOrNull })).default([])
    }),
    confianca: z.enum(["ALTA", "MEDIA", "BAIXA"]).catch("BAIXA"),
    campos_nulos: z.array(z.string()).default([]),
    fatura_distribuidora_id: zStringOrNull
  })
  .transform((result): BillExtraction => {
    const data = result.dados_extraidos;
    const history = data.historico_consumo.map((item) => item.consumo_kwh).filter((value): value is number => value !== null && value > 0);
    const average = history.length > 0 ? Math.round(history.reduce((sum, value) => sum + value, 0) / history.length) : null;
    const reviewFields = new Set(result.campos_nulos.map((field) => OCR_FIELD_MAP[field]).filter((field): field is string => field !== undefined));
    if (result.confianca === "BAIXA") ["holderName", "holderDocument", "ucNumber", "addressNumber"].forEach((field) => reviewFields.add(field));
    return {
      holderName: data.nome_titular,
      holderDocument: data.cpf_cnpj ? onlyDigits(data.cpf_cnpj) : null,
      ucNumber: data.numero_instalacao,
      utilityCode: data.distribuidora_sigla,
      cep: data.cep ? onlyDigits(data.cep) : null,
      street: data.logradouro,
      addressNumber: data.numero_endereco,
      district: data.bairro,
      city: data.cidade,
      uf: data.uf,
      tariffClass: data.classe_consumo,
      averageConsumptionKwh: average,
      confidence: result.confianca,
      lowConfidenceFields: [...reviewFields],
      faturaDistribuidoraId: result.fatura_distribuidora_id
    };
  });

// ── CEP (public lookup, same provider as the web portal) ──────────────

const cepSchema = z.object({ street: zStringOrEmpty, neighborhood: zStringOrEmpty, city: z.string(), state: z.string() });

function residenceBody(input: NewResidenceInput) {
  return {
    tipo_residencia: input.type,
    numero_uc: input.ucNumber,
    concessionaria: input.utilityCode,
    titular: input.holderName,
    cpf_cnpj_titular: input.holderDocument,
    cep: input.address.cep,
    logradouro: input.address.street,
    numero_endereco: input.address.number,
    complemento: input.address.complement ?? undefined,
    bairro: input.address.district,
    cidade: input.address.city,
    uf: input.address.uf,
    classe_tarifaria: input.tariffClass ?? undefined,
    documento_fatura_id: input.billDocumentId ?? undefined,
    fatura_distribuidora_id: input.faturaDistribuidoraId ?? undefined,
    consumo_medio_kwh: input.averageConsumptionKwh ?? undefined
  };
}

async function assertCanCreate(): Promise<void> {
  const availability = await remoteResidenceService.getCreationAvailability();
  if (!availability.canCreate) throw new AppError("BUSINESS_RULE_VIOLATION", availability.reason ?? DG_PENDING_LINK_MESSAGE);
}

export const remoteResidenceService: ResidenceService = {
  list: () => loadResidences(),

  async get(residenceId) {
    try {
      const [uc, modes, utilities] = await Promise.all([
        api.get("business", `/v1/consumidores/me/ucs/${encodeURIComponent(residenceId)}`, businessUcSchema),
        api.get("rateio", "/v1/ucs/minhas-ucs", zList(minhaUcSchema)).catch(() => []),
        api.get("business", "/v1/concessionarias", zList(utilitySchema)).catch(() => [])
      ]);
      return fromBusiness(uc, new Map(utilities.map((utility) => [utility.sigla, utility.nome] as const)), new Map(modes.map((mode) => [mode.id, mode.modo_cobranca] as const)));
    } catch (error) {
      if (!isAppError(error, "RESOURCE_NOT_FOUND") && !isAppError(error, "VALIDATION_ERROR")) throw error;
      // Operational units only exist in the billing snapshot.
      const snapshotUc = (await fetchSnapshot()).ucs.find((uc) => uc.id === residenceId);
      if (!snapshotUc) throw new AppError("RESOURCE_NOT_FOUND", "Unidade não encontrada.");
      return fromSnapshot(snapshotUc, new Map());
    }
  },

  async listUtilities() {
    const utilities = await api.get("business", "/v1/concessionarias", zList(utilitySchema));
    return utilities.map((utility): Utility => ({ code: utility.sigla, name: utility.nome, ufs: [] })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  async getCreationAvailability() {
    const consumer = await fetchConsumer();
    if (!consumer) return { canCreate: false, reason: "Conclua seu cadastro de cliente no portal ACVEL antes de adicionar unidades." };
    return consumer.dg_status === "PENDENTE_VINCULO" ? { canCreate: false, reason: DG_PENDING_LINK_MESSAGE } : { canCreate: true, reason: null };
  },

  async lookupCep(cep) {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) throw new AppError("VALIDATION_ERROR", "O CEP deve ter 8 dígitos.");
    try {
      const address = await externalGet(`${config.cepApiUrl}/${digits}`, cepSchema);
      return { street: address.street, district: address.neighborhood, city: address.city, uf: address.state };
    } catch (error) {
      if (isAppError(error, "RESOURCE_NOT_FOUND")) throw new AppError("RESOURCE_NOT_FOUND", "CEP não encontrado. Preencha o endereço manualmente.");
      throw error;
    }
  },

  async uploadBill(file, onProgress) {
    const consumer = await requireConsumer();
    const document = await uploadConsumerDocument(consumer.id, "CONTA_DE_LUZ", file, "Fatura de energia - solicitação UC", onProgress);
    return { documentId: document.id, name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes };
  },

  extractBill: (file) => uploadMultipart("rateio", "/v1/fatura-ocr/processar", "arquivo", file, ocrSchema),

  async create(input) {
    await assertCanCreate();
    if (!input.billDocumentId) throw new AppError("VALIDATION_ERROR", "Envie a conta de luz para continuar.");
    const created = await api.post("business", "/v1/consumidores/me/ucs", businessUcSchema, { body: residenceBody(input) });
    return fromBusiness(created, new Map(), new Map());
  },

  async update(residenceId, input) {
    const updated = await api.patch("business", `/v1/consumidores/me/ucs/${encodeURIComponent(residenceId)}`, businessUcSchema, { body: residenceBody(input) });
    return fromBusiness(updated, new Map(), new Map());
  }
};
