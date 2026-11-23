import { config } from "@/config/env";
import type { GeneratorAccess } from "@/types/domain";
import { mockGeneratorService } from "./mock/generator.mock";
import { remoteGeneratorService } from "./remote/generator.remote";

/**
 * "Quero ser gerador" — the consumer asks ACVEL to enable the generator profile (same flow as the
 * card on the portal's /perfil). Granting access is an ADM operation and is not part of the app.
 * API (business): GET /v1/gerador-interest-requests/me, POST /v1/gerador-interest-requests
 * ({ source, message }); generator flag from GET /v1/auth/me (is_generator) / GET /v1/consumidores/me.
 */
export interface GeneratorService {
  getAccess(): Promise<GeneratorAccess>;
  /** Opens a request (the ACVEL team contacts the consumer). */
  requestAccess(message?: string): Promise<GeneratorAccess>;
}

export const generatorService: GeneratorService = config.useMocks ? mockGeneratorService : remoteGeneratorService;
