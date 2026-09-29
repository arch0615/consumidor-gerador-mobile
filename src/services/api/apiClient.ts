import type { z } from "zod";
import { apiBaseUrl, config, type ApiTarget } from "@/config/env";
import { AppError } from "@/utils/app-error";
import { devLog } from "@/utils/logger";
import { authBridge } from "./auth-bridge";
import { apiErrorFromResponse } from "./http-errors";
import type { JsonValue } from "./schema";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequest<S extends z.ZodType> {
  api: ApiTarget;
  method: HttpMethod;
  /** Path starting with `/v1/...` (never a full URL). */
  path: string;
  query?: Readonly<Record<string, QueryValue>>;
  body?: JsonValue | FormData;
  /** Every response is validated; a mismatch is reported as INVALID_RESPONSE. */
  schema: S;
  /** Default true: sends `Authorization: Bearer <Firebase ID token>`. */
  authenticated?: boolean;
  idempotencyKey?: string;
  timeoutMs?: number;
}

export function buildUrl(baseUrl: string, path: string, query?: Readonly<Record<string, QueryValue>>): string {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const search = Object.entries(query)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== null && entry[1] !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return search ? `${url}?${search}` : url;
}

async function send(request: ApiRequest<z.ZodType>, url: string, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const isForm = typeof FormData !== "undefined" && request.body instanceof FormData;
  if (request.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (request.idempotencyKey) headers["Idempotency-Key"] = request.idempotencyKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs ?? config.apiTimeoutMs);
  try {
    return await fetch(url, {
      method: request.method,
      headers,
      body: request.body === undefined ? undefined : isForm ? (request.body as FormData) : JSON.stringify(request.body),
      signal: controller.signal
    });
  } catch {
    throw new AppError(controller.signal.aborted ? "TIMEOUT" : "NETWORK_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Non-JSON success bodies are a contract violation; error bodies are just ignored.
    if (response.ok) throw new AppError("INVALID_RESPONSE", undefined, { status: response.status });
    return null;
  }
}

/**
 * Single HTTP entry point for the three ACVEL APIs.
 * - base URL per API from env (never hard-coded)
 * - Bearer Firebase ID token; on 401: force-refresh once and retry, then end the session
 * - timeout / offline → TIMEOUT / NETWORK_UNAVAILABLE
 * - error envelopes (canonical + legacy) → AppError
 * - response validated with the request's Zod schema
 * - dev logging of method, path, status and duration only
 */
export async function apiRequest<S extends z.ZodType>(request: ApiRequest<S>): Promise<z.output<S>> {
  const baseUrl = apiBaseUrl(request.api);
  if (!baseUrl) throw new AppError("NOT_CONFIGURED");
  const url = buildUrl(baseUrl, request.path, request.query);
  const authenticated = request.authenticated !== false;
  const started = Date.now();

  let token: string | null = null;
  if (authenticated) {
    token = await authBridge().getIdToken(false);
    if (!token) throw new AppError("AUTH_REQUIRED", undefined, { status: 401 });
  }

  let response = await send(request, url, token);
  if (response.status === 401 && authenticated) {
    const refreshed = await authBridge().getIdToken(true).catch(() => null);
    if (refreshed) response = await send(request, url, refreshed);
    if (response.status === 401) authBridge().onUnauthorized();
  }

  devLog.info("api", `${request.method} ${request.api} ${request.path} → ${response.status} (${Date.now() - started} ms)`);

  const body = await readBody(response);
  if (!response.ok) throw apiErrorFromResponse(response.status, body, response.headers.get("x-request-id"));

  const parsed = request.schema.safeParse(body);
  if (!parsed.success) {
    devLog.warn("api", `Unexpected response shape for ${request.method} ${request.path}: ${parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`).slice(0, 5).join("; ")}`);
    throw new AppError("INVALID_RESPONSE", undefined, { status: response.status });
  }
  return parsed.data;
}

type Options<S extends z.ZodType> = Omit<ApiRequest<S>, "api" | "method" | "path" | "schema">;

/** Convenience wrappers: `api.get("rateio", "/v1/faturas/me", schema, { query })`. */
export const api = {
  get: <S extends z.ZodType>(target: ApiTarget, path: string, schema: S, options: Options<S> = {}) => apiRequest({ ...options, api: target, method: "GET", path, schema }),
  post: <S extends z.ZodType>(target: ApiTarget, path: string, schema: S, options: Options<S> = {}) => apiRequest({ ...options, api: target, method: "POST", path, schema }),
  put: <S extends z.ZodType>(target: ApiTarget, path: string, schema: S, options: Options<S> = {}) => apiRequest({ ...options, api: target, method: "PUT", path, schema }),
  patch: <S extends z.ZodType>(target: ApiTarget, path: string, schema: S, options: Options<S> = {}) => apiRequest({ ...options, api: target, method: "PATCH", path, schema }),
  delete: <S extends z.ZodType>(target: ApiTarget, path: string, schema: S, options: Options<S> = {}) => apiRequest({ ...options, api: target, method: "DELETE", path, schema })
};

/**
 * GET to a third-party public JSON API (e.g. CEP lookup). No Authorization
 * header is ever attached; the base URL still comes from configuration.
 */
export async function externalGet<S extends z.ZodType>(url: string, schema: S): Promise<z.output<S>> {
  if (!/^https:\/\//.test(url)) throw new AppError("NOT_CONFIGURED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.apiTimeoutMs);
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
  } catch {
    throw new AppError(controller.signal.aborted ? "TIMEOUT" : "NETWORK_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new AppError(response.status === 404 ? "RESOURCE_NOT_FOUND" : "SERVICE_UNAVAILABLE", undefined, { status: response.status });
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new AppError("INVALID_RESPONSE");
  return parsed.data;
}
