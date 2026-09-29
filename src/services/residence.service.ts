import { config } from "@/config/env";
import type { Address, BillExtraction, LocalFile, NewResidenceInput, Residence, UploadedDocument, Utility } from "@/types/domain";
import { mockResidenceService } from "./mock/residence.mock";
import { remoteResidenceService } from "./remote/residence.remote";

export interface CreationAvailability {
  canCreate: boolean;
  reason: string | null;
}

/**
 * Consumer units ("residências") and the add/edit-unit wizard.
 * API (business): GET|POST /v1/consumidores/me/ucs, GET|PATCH /v1/consumidores/me/ucs/{id},
 *   GET /v1/consumidores/me/rateio-snapshot, GET /v1/concessionarias, GET /v1/consumidores/me,
 *   POST /v1/documentos/presign-upload + confirm-upload (tipo FATURA_ENERGIA).
 * API (rateio): GET /v1/ucs/minhas-ucs (billing mode), POST /v1/fatura-ocr/processar (multipart `arquivo`).
 * CEP: public lookup service (EXPO_PUBLIC_CEP_API_URL).
 */
export interface ResidenceService {
  list(): Promise<Residence[]>;
  get(residenceId: string): Promise<Residence>;
  listUtilities(): Promise<Utility[]>;
  getCreationAvailability(): Promise<CreationAvailability>;
  lookupCep(cep: string): Promise<Omit<Address, "cep" | "number" | "complement">>;
  uploadBill(file: LocalFile, onProgress: (progress: number) => void): Promise<UploadedDocument>;
  /** AI reading of the bill (the API receives the file itself). */
  extractBill(file: LocalFile): Promise<BillExtraction>;
  create(input: NewResidenceInput): Promise<Residence>;
  /** Fix and resubmit a registration (e.g. after REPROVADA). */
  update(residenceId: string, input: NewResidenceInput): Promise<Residence>;
}

export const residenceService: ResidenceService = config.useMocks ? mockResidenceService : remoteResidenceService;
