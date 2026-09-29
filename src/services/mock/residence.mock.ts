import { billExtractionSample, cepDirectory, residences, utilities } from "@/mock/residence";
import type { NewResidenceInput, Residence } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import { onlyDigits } from "@/utils/format";
import type { ResidenceService } from "../residence.service";
import { mockId, mockMutation, mockQuery, mockUpload } from "./mock-request";

function findResidence(residenceId: string): Residence {
  const residence = residences.find((candidate) => candidate.id === residenceId);
  if (!residence) throw new AppError("RESOURCE_NOT_FOUND", "Unidade não encontrada.");
  return residence;
}

function utilityName(code: string): string {
  return utilities.find((candidate) => candidate.code === code)?.name ?? code;
}

function applyInput(residence: Residence, input: NewResidenceInput): Residence {
  return {
    ...residence,
    type: input.type,
    ucNumber: input.ucNumber,
    utility: utilityName(input.utilityCode),
    utilityCode: input.utilityCode,
    holderName: input.holderName,
    holderDocument: input.holderDocument,
    address: input.address,
    averageConsumptionKwh: input.averageConsumptionKwh,
    status: "EM_ANALISE_ADMIN",
    rejectionReason: null
  };
}

export const mockResidenceService: ResidenceService = {
  list: () => mockQuery(() => residences, () => []),

  get: (residenceId) => mockQuery(() => findResidence(residenceId)),

  listUtilities: () => mockQuery(() => [...utilities]),

  getCreationAvailability: () => mockQuery(() => ({ canCreate: true, reason: null })),

  lookupCep: (cep) =>
    mockMutation(() => {
      const entry = cepDirectory[onlyDigits(cep)];
      if (!entry) throw new AppError("RESOURCE_NOT_FOUND", "CEP não encontrado. Preencha o endereço manualmente.");
      return entry;
    }),

  async uploadBill(file, onProgress) {
    await mockUpload(onProgress);
    return { documentId: mockId("doc"), name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes };
  },

  extractBill: () => mockMutation(() => billExtractionSample),

  create: (input) =>
    mockMutation(() => {
      if (residences.some((residence) => residence.ucNumber === input.ucNumber)) {
        throw new AppError("CONFLICT", "Esta unidade consumidora já está cadastrada.");
      }
      const residence = applyInput(
        {
          id: mockId("res"),
          type: input.type,
          ucNumber: input.ucNumber,
          utility: "",
          utilityCode: null,
          holderName: "",
          holderDocument: "",
          address: input.address,
          status: "EM_ANALISE_ADMIN",
          submittedAt: new Date().toISOString(),
          averageConsumptionKwh: null,
          billingMode: null,
          rejectionReason: null,
          contractSigningUrl: null,
          editable: true
        },
        input
      );
      residences.push(residence);
      return residence;
    }),

  update: (residenceId, input) =>
    mockMutation(() => {
      const index = residences.findIndex((candidate) => candidate.id === residenceId);
      const current = residences[index];
      if (!current) throw new AppError("RESOURCE_NOT_FOUND", "Unidade não encontrada.");
      const updated = applyInput(current, input);
      residences[index] = updated;
      return updated;
    })
};
