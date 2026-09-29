import { z } from "zod";
import { AppError } from "@/utils/app-error";
import { apiRequest } from "../apiClient";
import { registerAuthBridge } from "../auth-bridge";

jest.mock("@/config/env", () => ({
  config: { apiTimeoutMs: 1000 },
  apiBaseUrl: (target: string) => (target === "rateio" ? "" : `https://${target}.api.test`)
}));

interface FakeResponse {
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  text: () => Promise<string>;
}

function respond(status: number, body?: unknown, headers: Record<string, string> = {}): FakeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: () => Promise.resolve(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body))
  };
}

const fetchMock = jest.fn<Promise<FakeResponse>, [string, RequestInit]>();
const getIdToken = jest.fn<Promise<string | null>, [boolean]>();
const onUnauthorized = jest.fn();
const schema = z.object({ ok: z.boolean() });

beforeEach(() => {
  fetchMock.mockReset();
  getIdToken.mockReset();
  onUnauthorized.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  getIdToken.mockImplementation((force) => Promise.resolve(force ? "fresh-token" : "cached-token"));
  registerAuthBridge({ getIdToken, onUnauthorized });
});

function headersOf(call: number): Record<string, string> {
  return (fetchMock.mock.calls[call]?.[1]?.headers ?? {}) as Record<string, string>;
}

describe("apiRequest", () => {
  it("sends the Firebase ID token as Bearer and validates the response", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true }));
    await expect(apiRequest({ api: "auth", method: "GET", path: "/v1/auth/me", schema })).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://auth.api.test/v1/auth/me");
    expect(headersOf(0).Authorization).toBe("Bearer cached-token");
  });

  it("serialises query parameters and skips empty values", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true }));
    await apiRequest({ api: "business", method: "GET", path: "/v1/documentos", query: { consumidor_id: "a b", page: 1, empty: "", skip: undefined }, schema });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://business.api.test/v1/documentos?consumidor_id=a%20b&page=1");
  });

  it("refreshes the token once on 401 and retries", async () => {
    fetchMock.mockResolvedValueOnce(respond(401, { error: { code: "AUTH_TOKEN_EXPIRED", message: "x", requestId: "r" } })).mockResolvedValueOnce(respond(200, { ok: true }));
    await expect(apiRequest({ api: "auth", method: "GET", path: "/v1/auth/me", schema })).resolves.toEqual({ ok: true });
    expect(getIdToken).toHaveBeenLastCalledWith(true);
    expect(headersOf(1).Authorization).toBe("Bearer fresh-token");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("ends the session when still 401 after the refresh", async () => {
    fetchMock.mockResolvedValue(respond(401, { error: { code: "AUTH_TOKEN_REVOKED", message: "x", requestId: "r" } }));
    await expect(apiRequest({ api: "auth", method: "GET", path: "/v1/auth/me", schema })).rejects.toMatchObject({ code: "AUTH_TOKEN_EXPIRED", status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("refuses authenticated calls without a token (fail closed)", async () => {
    getIdToken.mockResolvedValue(null);
    await expect(apiRequest({ api: "auth", method: "GET", path: "/v1/auth/me", schema })).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends public requests without Authorization", async () => {
    fetchMock.mockResolvedValueOnce(respond(201, { ok: true }));
    await apiRequest({ api: "auth", method: "POST", path: "/v1/auth/register", body: { email: "a@b.c" }, authenticated: false, schema });
    expect(headersOf(0).Authorization).toBeUndefined();
    expect(headersOf(0)["Content-Type"]).toBe("application/json");
  });

  it("maps a network failure to NETWORK_UNAVAILABLE", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(apiRequest({ api: "auth", method: "GET", path: "/v1/auth/me", schema })).rejects.toMatchObject({ code: "NETWORK_UNAVAILABLE" });
  });

  it("maps a timeout to TIMEOUT", async () => {
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );
    await expect(apiRequest({ api: "auth", method: "GET", path: "/v1/auth/me", schema, timeoutMs: 20 })).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("reports a contract mismatch as INVALID_RESPONSE", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { unexpected: 1 }));
    await expect(apiRequest({ api: "auth", method: "GET", path: "/v1/auth/me", schema })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("treats 204 as an empty body", async () => {
    fetchMock.mockResolvedValueOnce(respond(204));
    await expect(apiRequest({ api: "auth", method: "PATCH", path: "/v1/auth/change-password", schema: z.null() })).resolves.toBeNull();
  });

  it("fails with NOT_CONFIGURED when the API URL is missing", async () => {
    await expect(apiRequest({ api: "rateio", method: "GET", path: "/v1/faturas/me", schema })).rejects.toBeInstanceOf(AppError);
    await expect(apiRequest({ api: "rateio", method: "GET", path: "/v1/faturas/me", schema })).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the Idempotency-Key header when provided", async () => {
    fetchMock.mockResolvedValueOnce(respond(201, { ok: true }));
    await apiRequest({ api: "business", method: "POST", path: "/v1/pedidos", body: { produto_id: "p" }, idempotencyKey: "key-1", schema });
    expect(headersOf(0)["Idempotency-Key"]).toBe("key-1");
  });
});
