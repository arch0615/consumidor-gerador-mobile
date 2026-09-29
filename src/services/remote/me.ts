import { z } from "zod";
import type { AccountIdentity } from "@/types/domain";
import { api } from "../api/apiClient";
import { zStringOrNull } from "../api/schema";

// ── GET /v1/auth/me (consumidor-gerador-api Swagger: `Me`) ────────────

const ONBOARDING_STATUSES = ["DRAFT", "PENDING_SUBMISSION", "EM_ANALISE", "APROVADO", "REPROVADO", "SUSPENSO"] as const;

export const meSchema = z
  .object({
    userId: z.string().min(1),
    email: z.string(),
    displayName: z.string().nullish(),
    phoneNumber: zStringOrNull,
    tipoUsuario: z.enum(["CONSUMIDOR", "GERADOR", "LICENCIADO"]).nullish(),
    status: z.enum(["ACTIVE", "SUSPENDED", "DELETION_REQUESTED", "ANONYMIZED"]).default("ACTIVE"),
    roles: z.array(z.union([z.string(), z.object({ slug: z.string() })])).default([]),
    permissions: z.array(z.object({ resource: z.string(), action: z.string(), scope: z.string().nullish() })).default([]),
    cpf_cnpj: zStringOrNull,
    consumerId: zStringOrNull,
    is_generator: z.boolean().default(false),
    onboarding_status: z.enum(ONBOARDING_STATUSES).nullish(),
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
  });

export type MeResult = z.output<typeof meSchema>;

export function fetchMe(): Promise<MeResult> {
  return api.get("auth", "/v1/auth/me", meSchema);
}
