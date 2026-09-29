import { z } from "zod";
import type { AccountDocument, DocumentKind, DocumentValidation, LocalFile } from "@/types/domain";
import { api } from "../api/apiClient";
import { uploadToPresignedUrl } from "../api/file-transfer";
import { zId, zList, zStringOrNull } from "../api/schema";

/** Business-API document types (`tipo`). */
export type BusinessDocumentType = "RG" | "CNH" | "CNPJ" | "FATURA_ENERGIA" | "COMPROVANTE_RESIDENCIA" | "CONTRATO" | "OUTRO";

const KIND_TO_TYPE: Record<DocumentKind, BusinessDocumentType> = {
  RG: "RG",
  CNH: "CNH",
  CNPJ: "CNPJ",
  CONTA_DE_LUZ: "FATURA_ENERGIA",
  CONTRATO: "CONTRATO",
  OUTRO: "OUTRO"
};

function kindOf(type: string): DocumentKind {
  switch (type.toUpperCase()) {
    case "RG":
      return "RG";
    case "CNH":
      return "CNH";
    case "CNPJ":
      return "CNPJ";
    case "FATURA_ENERGIA":
      return "CONTA_DE_LUZ";
    case "CONTRATO":
    case "CONTRATO_ASSINADO":
      return "CONTRATO";
    default:
      return "OUTRO";
  }
}

function validationOf(status: string | null): DocumentValidation {
  switch ((status ?? "").toUpperCase()) {
    case "APROVADO":
      return "APROVADO";
    case "REPROVADO":
      return "REPROVADO";
    case "EM_ANALISE":
      return "EM_ANALISE";
    default:
      return "PENDENTE";
  }
}

export const documentSchema = z
  .object({
    id: zId,
    tipo: z.string().default("OUTRO"),
    arquivo_nome: zStringOrNull,
    status_validacao: zStringOrNull,
    reprovado_motivo: zStringOrNull,
    created_at: zStringOrNull
  })
  .transform(
    (doc): AccountDocument => ({
      id: doc.id,
      kind: kindOf(doc.tipo),
      name: doc.arquivo_nome ?? "Documento",
      status: validationOf(doc.status_validacao),
      rejectionReason: doc.reprovado_motivo,
      uploadedAt: doc.created_at ?? new Date(0).toISOString()
    })
  );

const presignSchema = z.object({
  upload_url: z.string().min(1),
  upload_method: z.string().default("PUT"),
  arquivo_path: z.string().min(1)
});

/** GET /v1/documentos?proprietario_tipo=CONSUMIDOR&consumidor_id=… (newest first). */
export function listConsumerDocuments(consumerId: string): Promise<AccountDocument[]> {
  return api.get("business", "/v1/documentos", zList(documentSchema), {
    query: { proprietario_tipo: "CONSUMIDOR", consumidor_id: consumerId, page: 1, per_page: 100 }
  });
}

/**
 * Presigned upload used by the web portal:
 * POST /v1/documentos/presign-upload → PUT bytes to `upload_url` → POST /v1/documentos/confirm-upload.
 * Ownership is checked by the backend against the token (consumidor_id is only a routing hint).
 */
export async function uploadConsumerDocument(
  consumerId: string,
  kind: DocumentKind,
  file: LocalFile,
  description: string,
  onProgress: (progress: number) => void
): Promise<AccountDocument> {
  const tipo = KIND_TO_TYPE[kind];
  // Same checksum format as the web portal (the API stores it as an opaque correlation value).
  const checksum = `${Date.now()}-${file.sizeBytes}`;
  const fileFields = { arquivo_nome: file.name, arquivo_tamanho: file.sizeBytes, arquivo_mime_type: file.mimeType, arquivo_checksum: checksum };

  const presign = await api.post("business", "/v1/documentos/presign-upload", presignSchema, {
    body: { proprietario_tipo: "CONSUMIDOR", consumidor_id: consumerId, tipo, ...fileFields }
  });

  // Upload reports 0–95 %; confirmation completes the bar.
  await uploadToPresignedUrl("business", presign.upload_url, presign.upload_method, file, (progress) => onProgress(progress * 0.95));

  const confirmed = await api.post("business", "/v1/documentos/confirm-upload", documentSchema, {
    body: { proprietario_tipo: "CONSUMIDOR", consumidor_id: consumerId, tipo, descricao: description, arquivo_path: presign.arquivo_path, ...fileFields }
  });
  onProgress(1);
  return confirmed;
}

const signedUrlSchema = z
  .object({ signed_url: z.string().optional(), signedUrl: z.string().optional(), url: z.string().optional() })
  .transform((value) => value.signed_url ?? value.signedUrl ?? value.url ?? "")
  .pipe(z.string().regex(/^https?:\/\//, "signed URL expected"));

/** GET /v1/documentos/{id}/signed-url → short-lived https URL. */
export function documentSignedUrl(documentId: string): Promise<string> {
  return api.get("business", `/v1/documentos/${encodeURIComponent(documentId)}/signed-url`, signedUrlSchema);
}
