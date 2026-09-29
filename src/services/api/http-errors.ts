import { z } from "zod";
import { AppError, defaultErrorMessage, type AppErrorCode } from "@/utils/app-error";

/** consumidor-gerador-api envelope: `{ error: { code, message, details, requestId } }`. */
const canonicalErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
    requestId: z.string().optional()
  })
});

/** Legacy (NestJS) envelope used by business/rateio: `{ message: string | string[], error?: string }`. */
const legacyErrorSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]).optional(),
  error: z.string().optional()
});

const BACKEND_CODE_MAP: Readonly<Record<string, AppErrorCode>> = {
  AUTH_REQUIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_REVOKED: "AUTH_TOKEN_EXPIRED",
  FORBIDDEN: "FORBIDDEN",
  ACCOUNT_NOT_PROVISIONED: "ACCOUNT_NOT_PROVISIONED",
  PLATFORM_FORBIDDEN: "ACCOUNT_NOT_PROVISIONED",
  ACCOUNT_DISABLED: "ACCOUNT_BLOCKED",
  ACCOUNT_SUSPENDED: "ACCOUNT_BLOCKED",
  ACCOUNT_DELETED: "ACCOUNT_BLOCKED",
  ROUTE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  DELETION_REQUEST_NOT_FOUND: "RESOURCE_NOT_FOUND",
  CONFLICT: "CONFLICT",
  EMAIL_ALREADY_REGISTERED: "EMAIL_ALREADY_REGISTERED",
  PHONE_ALREADY_REGISTERED: "PHONE_ALREADY_REGISTERED",
  IDEMPOTENCY_KEY_IN_USE: "CONFLICT",
  PAYLOAD_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_MEDIA_TYPE: "UNSUPPORTED_FILE",
  WEAK_PASSWORD: "WEAK_PASSWORD",
  INVALID_CURRENT_PASSWORD: "INVALID_CREDENTIALS",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MALFORMED_REQUEST: "VALIDATION_ERROR",
  INTERNAL_ERROR: "SERVICE_UNAVAILABLE",
  AUTH_PROVIDER_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DEPENDENCY_UNAVAILABLE: "SERVICE_UNAVAILABLE"
};

export function codeForStatus(status: number): AppErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "AUTH_TOKEN_EXPIRED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "RESOURCE_NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "FILE_TOO_LARGE";
  if (status === 415) return "UNSUPPORTED_FILE";
  if (status === 422) return "BUSINESS_RULE_VIOLATION";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVICE_UNAVAILABLE";
  return "UNKNOWN";
}

/** Business-rule messages from the backend are shown to the user; everything else uses our copy. */
const BACKEND_MESSAGE_CODES: ReadonlySet<AppErrorCode> = new Set([
  "VALIDATION_ERROR",
  "CONFLICT",
  "BUSINESS_RULE_VIOLATION",
  "EMAIL_ALREADY_REGISTERED",
  "PHONE_ALREADY_REGISTERED",
  "WEAK_PASSWORD",
  "INVALID_CREDENTIALS",
  "RESOURCE_NOT_FOUND"
]);

const MAX_MESSAGE_LENGTH = 240;

/** Rejects text that looks technical (HTML, stack traces, SQL, huge payloads). */
function safeUserMessage(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return undefined;
  if (/<[a-z!/]|\bat\s+\S+\s*\(|Exception|prisma|SELECT\s|stack/i.test(trimmed)) return undefined;
  return trimmed;
}

/**
 * Normalises an HTTP error response (both envelope styles) into an AppError.
 * 5xx never exposes backend text.
 */
export function apiErrorFromResponse(status: number, body: unknown, requestIdHeader: string | null): AppError {
  const canonical = canonicalErrorSchema.safeParse(body);
  if (canonical.success) {
    const code = BACKEND_CODE_MAP[canonical.data.error.code] ?? codeForStatus(status);
    const message = status < 500 && BACKEND_MESSAGE_CODES.has(code) ? safeUserMessage(canonical.data.error.message) : undefined;
    return new AppError(code, message ?? defaultErrorMessage(code), { status, requestId: canonical.data.error.requestId ?? requestIdHeader });
  }

  const code = codeForStatus(status);
  const legacy = legacyErrorSchema.safeParse(body);
  let message: string | undefined;
  if (legacy.success && status < 500 && BACKEND_MESSAGE_CODES.has(code)) {
    const raw = legacy.data.message;
    message = safeUserMessage(Array.isArray(raw) ? raw.join(". ") : raw);
  }
  return new AppError(code, message ?? defaultErrorMessage(code), { status, requestId: requestIdHeader });
}
