import { z } from "zod";
import type { GeneratorAccess, GeneratorRequest, GeneratorRequestStatus } from "@/types/domain";
import { api } from "../api/apiClient";
import { zId, zIgnoredBody, zList, zStringOrNull } from "../api/schema";
import type { GeneratorService } from "../generator.service";
import { fetchConsumer } from "./business";
import { fetchMe } from "./me";

/** Same default text the portal sends; the API caps the message at 1000 characters. */
const DEFAULT_MESSAGE = "Usuario demonstrou interesse em se tornar gerador pelo aplicativo.";
const MAX_MESSAGE_LENGTH = 1000;

/**
 * Request status. The admin side marks a request as contacted, grants the generator access or
 * closes it (/v1/admin/gerador-interest-requests/{id}/mark-contacted | grant-generator-access | close);
 * the exact labels are not documented, so they are matched by meaning.
 */
export function generatorRequestStatusOf(raw: string | null): GeneratorRequestStatus {
  const value = (raw ?? "").toUpperCase();
  if (/GRANT|APROV|HABILIT|CONCED/.test(value)) return "APROVADA";
  if (/CLOS|FECH|ENCERR|CANCEL|REJ|REPROV|NEGAD/.test(value)) return "ENCERRADA";
  if (/CONTACT|CONTAT/.test(value)) return "EM_CONTATO";
  return "ABERTA";
}

const requestSchema = z
  .object({
    id: zId,
    status: zStringOrNull,
    message: zStringOrNull,
    mensagem: zStringOrNull,
    created_at: zStringOrNull,
    createdAt: zStringOrNull
  })
  .transform(
    (request): GeneratorRequest => ({
      id: request.id,
      status: generatorRequestStatusOf(request.status),
      createdAt: request.created_at ?? request.createdAt ?? new Date(0).toISOString(),
      message: request.message ?? request.mensagem
    })
  );

async function loadAccess(): Promise<GeneratorAccess> {
  const [me, consumer, requests] = await Promise.all([
    fetchMe(),
    fetchConsumer().catch(() => null),
    api.get("business", "/v1/gerador-interest-requests/me", zList(requestSchema))
  ]);
  const newestFirst = [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    isGenerator: me.identity.isGenerator || consumer?.is_generator === true,
    requests: newestFirst,
    openRequest: newestFirst.find((request) => request.status === "ABERTA" || request.status === "EM_CONTATO") ?? null
  };
}

export const remoteGeneratorService: GeneratorService = {
  getAccess: loadAccess,

  async requestAccess(message) {
    const text = message?.trim() ? message.trim().slice(0, MAX_MESSAGE_LENGTH) : DEFAULT_MESSAGE;
    // Swagger CreateGeradorInterestRequestDto: source HOME_CARD | PROFILE | SUPPORT | OTHER (the app entry sits in "Conta").
    await api.post("business", "/v1/gerador-interest-requests", zIgnoredBody, { body: { source: "PROFILE", message: text } });
    return loadAccess();
  }
};
