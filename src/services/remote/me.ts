import { z } from "zod";
import type { AccountIdentity } from "@/types/domain";
import { api } from "../api/apiClient";
import { zStringOrNull } from "../api/schema";

// ── GET /v1/auth/me ────────────────────────────────────────────────────
// Canonical shape: consumidor-gerador-api Swagger "Me". The live auth-api (legacy)
// may answer with the aliases the web portal's mapper accepts (services/auth/auth.api.ts
// mapBackendUser): id/uid, a nested "user" object, snake_case names. They are normalised
// here, before validation, so both backends parse the same way.

type Json = Record<string, unknown>;

function asJson(value: unknown): Json {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : {};
}

function first(source: Json, keys: readonly string[]): unknown {
  for (const key of keys) if (source[key] !== undefined && source[key] !== null) return source[key];
  return undefined;
}

function normaliseMe(raw: unknown): unknown {
  const root = asJson(raw);
  // Root fields win over the nested legacy "user" object.
  const merged: Json = { ...asJson(root.user), ...root };
  const tipo = first(merged, ["tipoUsuario", "tipo_usuario"]);
  const userType = typeof tipo === "string" ? tipo.toUpperCase() : undefined;
  const completed = first(merged, ["onboarding_completed", "onboardingCompleted"]);
  return {
    ...merged,
    userId: first(merged, ["userId", "id", "uid"]),
    displayName: first(merged, ["displayName", "display_name", "nome_completo", "name"]),
    phoneNumber: first(merged, ["phoneNumber", "phone_number", "telefone", "phone"]),
    tipoUsuario: userType,
    cpf_cnpj: first(merged, ["cpf_cnpj", "cpf"]),
    consumerId: first(merged, ["consumerId", "consumidor_id", "consumer_id"]),
    onboarding_status: first(merged, ["onboarding_status", "onboardingStatus"]),
    // Same inference as the web portal when the flag is absent: consumers still onboarding, others done.
    onboarding_completed: typeof completed === "boolean" ? completed : userType !== "CONSUMIDOR",
    created_at: first(merged, ["created_at", "createdAt"])
  };
}


const ONBOARDING_STATUSES = ["DRAFT", "PENDING_SUBMISSION", "EM_ANALISE", "APROVADO", "REPROVADO", "SUSPENSO"] as const;

export const meSchema = z.preprocess(
  normaliseMe,
  z
  .object({
    userId: z.union([z.string().min(1), z.number()]).transform(String),
    email: z.string(),
    displayName: z.string().nullish(),
    phoneNumber: zStringOrNull,
    tipoUsuario: z.enum(["CONSUMIDOR", "GERADOR", "LICENCIADO"]).nullish().catch(null),
    // Blocked accounts are rejected by the API (403); an unknown label must not break login.
    status: z.enum(["ACTIVE", "SUSPENDED", "DELETION_REQUESTED", "ANONYMIZED"]).default("ACTIVE").catch("ACTIVE"),
    roles: z.array(z.union([z.string(), z.object({ slug: z.string() })])).default([]),
    permissions: z.array(z.object({ resource: z.string(), action: z.string(), scope: z.string().nullish() })).default([]),
    cpf_cnpj: zStringOrNull,
    consumerId: zStringOrNull,
    is_generator: z.boolean().default(false),
    onboarding_status: z.enum(ONBOARDING_STATUSES).nullish().catch(null),
    onboarding_completed: z.boolean().default(false),
    created_at: zStringOrNull
  })
  .transform((me) => {
    const displayName = me.displayName?.trim() || me.email.split("@")[0] || "Cliente";
    const identity: AccountIdentity = {
      userId: me.userId,
      email: me.email,
      displayName,
      firstName: displayName.split(/\s+/)[0] ?? displayName,
      status: me.status,
      userType: me.tipoUsuario ?? null,
      roles: me.roles.map((role) => (typeof role === "string" ? role : role.slug)),
      permissions: me.permissions.map((permission) => ({ resource: permission.resource, action: permission.action, scope: permission.scope ?? null })),
      consumerId: me.consumerId,
      isGenerator: me.is_generator,
      onboardingStatus: me.onboarding_status ?? null,
      onboardingCompleted: me.onboarding_completed
    };
    return { identity, phoneNumber: me.phoneNumber, document: me.cpf_cnpj, createdAt: me.created_at };
  })
);

export type MeResult = z.output<typeof meSchema>;

export function fetchMe(): Promise<MeResult> {
  return api.get("auth", "/v1/auth/me", meSchema);
}
