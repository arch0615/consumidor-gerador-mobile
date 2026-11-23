import type { GeneratorAccess, GeneratorRequest } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import type { GeneratorService } from "../generator.service";
import { mockId, mockMutation, mockQuery } from "./mock-request";

const requests: GeneratorRequest[] = [];

function access(): GeneratorAccess {
  const newestFirst = [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { isGenerator: false, requests: newestFirst, openRequest: newestFirst.find((request) => request.status === "ABERTA" || request.status === "EM_CONTATO") ?? null };
}

export const mockGeneratorService: GeneratorService = {
  getAccess: () => mockQuery(access),

  requestAccess: (message) =>
    mockMutation(() => {
      if (access().openRequest) throw new AppError("CONFLICT", "Você já tem uma solicitação em andamento.");
      requests.push({ id: mockId("ger"), status: "ABERTA", createdAt: new Date().toISOString(), message: message?.trim() || null });
      return access();
    })
};
