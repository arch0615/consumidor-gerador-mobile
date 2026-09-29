/**
 * Client-side error model. Codes mirror the backend error catalogue
 * (consumidor-gerador-api `error-codes.ts`); `services/api/http-errors.ts`
 * maps every backend/transport failure to one of these codes.
 */
export type AppErrorCode =
  | "NETWORK_UNAVAILABLE"
  | "TIMEOUT"
  | "AUTH_REQUIRED"
  | "AUTH_TOKEN_EXPIRED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_REGISTERED"
  | "PHONE_ALREADY_REGISTERED"
  | "WEAK_PASSWORD"
  | "VALIDATION_ERROR"
  | "RESOURCE_NOT_FOUND"
  | "FORBIDDEN"
  | "ACCOUNT_NOT_PROVISIONED"
  | "ACCOUNT_BLOCKED"
  | "CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "UPLOAD_FAILED"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "NOT_SUPPORTED"
  | "NOT_CONFIGURED"
  | "UNKNOWN";

const DEFAULT_MESSAGES: Record<AppErrorCode, string> = {
  NETWORK_UNAVAILABLE: "Sem conexão com a internet. Verifique sua rede e tente novamente.",
  TIMEOUT: "O servidor demorou para responder. Tente novamente.",
  AUTH_REQUIRED: "Sua sessão expirou. Entre novamente.",
  AUTH_TOKEN_EXPIRED: "Sua sessão expirou. Entre novamente.",
  INVALID_CREDENTIALS: "E-mail ou senha incorretos.",
  EMAIL_ALREADY_REGISTERED: "Já existe uma conta com este e-mail.",
  PHONE_ALREADY_REGISTERED: "Já existe uma conta com este telefone.",
  WEAK_PASSWORD: "A senha não atende aos requisitos de segurança.",
  VALIDATION_ERROR: "Confira os dados informados.",
  RESOURCE_NOT_FOUND: "Não encontramos o que você procura.",
  FORBIDDEN: "Seu perfil não tem permissão para acessar esta informação.",
  ACCOUNT_NOT_PROVISIONED: "Não encontramos uma conta de cliente para este e-mail.",
  ACCOUNT_BLOCKED: "Seu acesso está bloqueado. Fale com o suporte.",
  CONFLICT: "Esta ação já foi realizada.",
  BUSINESS_RULE_VIOLATION: "Não foi possível concluir esta ação.",
  UPLOAD_FAILED: "Não foi possível enviar o arquivo. Tente novamente.",
  FILE_TOO_LARGE: "O arquivo é maior que o permitido.",
  UNSUPPORTED_FILE: "Formato de arquivo não suportado.",
  RATE_LIMITED: "Muitas tentativas. Aguarde alguns instantes.",
  SERVICE_UNAVAILABLE: "Serviço temporariamente indisponível. Tente novamente em instantes.",
  INVALID_RESPONSE: "Recebemos uma resposta inesperada do servidor. Tente novamente mais tarde.",
  NOT_SUPPORTED: "Este recurso ainda não está disponível no aplicativo.",
  NOT_CONFIGURED: "O aplicativo não está configurado para acessar o servidor.",
  UNKNOWN: "Algo deu errado. Tente novamente."
};

export interface AppErrorOptions {
  /** HTTP status when the error came from an API response. */
  status?: number;
  /** Backend request id (x-request-id / error.requestId) for support tickets. */
  requestId?: string | null;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number | null;
  readonly requestId: string | null;

  constructor(code: AppErrorCode, message?: string, options: AppErrorOptions = {}) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? null;
    this.requestId = options.requestId ?? null;
  }

  /** Errors worth retrying automatically (network / timeout / 5xx). */
  get isTransient(): boolean {
    return this.code === "NETWORK_UNAVAILABLE" || this.code === "TIMEOUT" || this.code === "SERVICE_UNAVAILABLE";
  }
}

export function defaultErrorMessage(code: AppErrorCode): string {
  return DEFAULT_MESSAGES[code];
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError("UNKNOWN");
}

export function isAppError(error: unknown, code: AppErrorCode): boolean {
  return error instanceof AppError && error.code === code;
}

/** User-facing message for any thrown value (never raw technical text). */
export function errorMessage(error: unknown): string {
  return toAppError(error).message;
}
