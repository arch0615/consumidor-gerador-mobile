import { Directory, File, Paths, UploadType } from "expo-file-system";
import type { z } from "zod";
import { apiBaseUrl, type ApiTarget } from "@/config/env";
import type { LocalFile } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import { devLog } from "@/utils/logger";
import { buildUrl } from "./apiClient";
import { authBridge } from "./auth-bridge";
import { apiErrorFromResponse } from "./http-errors";

type ProgressCallback = (progress: number) => void;

interface RawResult {
  status: number;
  body: string;
  headers: Record<string, string>;
}

async function nativeUpload(url: string, file: LocalFile, options: { method: "POST" | "PUT" | "PATCH"; headers: Record<string, string>; multipartField?: string; onProgress?: ProgressCallback }): Promise<RawResult> {
  const task = new File(file.uri).createUploadTask(url, {
    httpMethod: options.method,
    headers: options.headers,
    mimeType: file.mimeType,
    uploadType: options.multipartField ? UploadType.MULTIPART : UploadType.BINARY_CONTENT,
    ...(options.multipartField ? { fieldName: options.multipartField } : {}),
    sessionType: "foreground",
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) options.onProgress?.(Math.min(bytesSent / totalBytes, 1));
    }
  });
  try {
    return await task.uploadAsync();
  } catch {
    throw new AppError("UPLOAD_FAILED");
  }
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function headerValue(headers: Record<string, string>, name: string): string | null {
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name);
  return key ? (headers[key] ?? null) : null;
}

/** Runs an authenticated transfer with the same 401 policy as the API client. */
async function withAuth(run: (token: string) => Promise<RawResult>): Promise<RawResult> {
  const token = await authBridge().getIdToken(false);
  if (!token) throw new AppError("AUTH_REQUIRED", undefined, { status: 401 });
  let result = await run(token);
  if (result.status === 401) {
    const refreshed = await authBridge().getIdToken(true).catch(() => null);
    if (refreshed) result = await run(refreshed);
    if (result.status === 401) authBridge().onUnauthorized();
  }
  return result;
}

function ensureOk(result: RawResult, label: string): void {
  devLog.info("upload", `${label} → ${result.status}`);
  if (result.status < 200 || result.status >= 300) throw apiErrorFromResponse(result.status, parseJson(result.body), headerValue(result.headers, "x-request-id"));
}

/**
 * Uploads raw file bytes to a presigned `upload_url`. Absolute URLs (object
 * storage) get no Authorization header; API-relative URLs (`/v1/...`) are
 * sent to the owning API with the Bearer token.
 */
export async function uploadToPresignedUrl(api: ApiTarget, uploadUrl: string, method: string, file: LocalFile, onProgress: ProgressCallback): Promise<void> {
  const httpMethod = method.toUpperCase() === "POST" ? "POST" : method.toUpperCase() === "PATCH" ? "PATCH" : "PUT";
  const contentType = { "Content-Type": file.mimeType };
  if (/^https?:\/\//.test(uploadUrl)) {
    ensureOk(await nativeUpload(uploadUrl, file, { method: httpMethod, headers: contentType, onProgress }), "presigned upload");
    return;
  }
  const baseUrl = apiBaseUrl(api);
  if (!baseUrl) throw new AppError("NOT_CONFIGURED");
  const url = buildUrl(baseUrl, uploadUrl.replace(/^\/api(?=\/v1\/)/, ""));
  const result = await withAuth((token) => nativeUpload(url, file, { method: httpMethod, headers: { ...contentType, Authorization: `Bearer ${token}` }, onProgress }));
  ensureOk(result, "api upload");
}

/** Authenticated multipart upload (e.g. bill OCR) whose JSON response is validated. */
export async function uploadMultipart<S extends z.ZodType>(api: ApiTarget, path: string, field: string, file: LocalFile, schema: S, onProgress?: ProgressCallback): Promise<z.output<S>> {
  const baseUrl = apiBaseUrl(api);
  if (!baseUrl) throw new AppError("NOT_CONFIGURED");
  const url = buildUrl(baseUrl, path);
  const result = await withAuth((token) =>
    nativeUpload(url, file, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, multipartField: field, ...(onProgress ? { onProgress } : {}) })
  );
  ensureOk(result, `POST ${api} ${path}`);
  const parsed = schema.safeParse(parseJson(result.body));
  if (!parsed.success) throw new AppError("INVALID_RESPONSE", undefined, { status: result.status });
  return parsed.data;
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(0, 80) || "arquivo";
}

/**
 * Downloads a protected file (Bearer token, redirects followed) into the
 * cache and returns its local URI. Retries once with a refreshed token.
 */
export async function downloadAuthenticatedFile(api: ApiTarget, path: string, fileName: string): Promise<string> {
  const baseUrl = apiBaseUrl(api);
  if (!baseUrl) throw new AppError("NOT_CONFIGURED");
  const url = buildUrl(baseUrl, path);
  const directory = new Directory(Paths.cache, "downloads");
  if (!directory.exists) directory.create({ intermediates: true });

  const attempt = async (token: string) => {
    const destination = new File(directory, safeFileName(fileName));
    if (destination.exists) destination.delete();
    return File.downloadFileAsync(url, destination, { headers: { Authorization: `Bearer ${token}` } });
  };

  const token = await authBridge().getIdToken(false);
  if (!token) throw new AppError("AUTH_REQUIRED", undefined, { status: 401 });
  try {
    return (await attempt(token)).uri;
  } catch {
    const refreshed = await authBridge().getIdToken(true).catch(() => null);
    if (!refreshed) throw new AppError("AUTH_REQUIRED", undefined, { status: 401 });
    try {
      return (await attempt(refreshed)).uri;
    } catch {
      throw new AppError("SERVICE_UNAVAILABLE", "Não foi possível baixar o arquivo. Tente novamente.");
    }
  }
}

/** Downloads a public/signed URL (no auth header) into the cache. */
export async function downloadPublicFile(url: string, fileName: string): Promise<string> {
  const directory = new Directory(Paths.cache, "downloads");
  if (!directory.exists) directory.create({ intermediates: true });
  const destination = new File(directory, safeFileName(fileName));
  if (destination.exists) destination.delete();
  try {
    return (await File.downloadFileAsync(url, destination)).uri;
  } catch {
    throw new AppError("SERVICE_UNAVAILABLE", "Não foi possível baixar o arquivo. Tente novamente.");
  }
}
