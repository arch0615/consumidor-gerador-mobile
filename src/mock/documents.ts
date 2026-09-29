import type { AccountDocument } from "@/types/domain";
import { daysAgo } from "./calendar";

export const accountDocuments: AccountDocument[] = [
  { id: "doc_001", kind: "CNH", name: "cnh-frente-verso.jpg", status: "APROVADO", rejectionReason: null, uploadedAt: daysAgo(330) },
  { id: "doc_002", kind: "CONTA_DE_LUZ", name: "conta-enel-casa.pdf", status: "APROVADO", rejectionReason: null, uploadedAt: daysAgo(330) },
  { id: "doc_003", kind: "CONTRATO", name: "contrato-acvel-casa.pdf", status: "APROVADO", rejectionReason: null, uploadedAt: daysAgo(322) },
  {
    id: "doc_004",
    kind: "CONTA_DE_LUZ",
    name: "conta-enel-apartamento.jpg",
    status: "REPROVADO",
    rejectionReason: "Imagem cortada — envie a conta completa, com o número da instalação visível.",
    uploadedAt: daysAgo(6)
  }
];
