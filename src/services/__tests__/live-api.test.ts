/**
 * LIVE validation against the real ACVEL APIs (opt-in, never part of `npm test`).
 *
 *   npm run test:live   → read-only checks (auth + all modules). Test-safety rule: the suite never
 *                         creates data in the shared environment — any non-GET request to the ACVEL
 *                         APIs is blocked and reported. (The app itself does have user write actions
 *                         with portal parity; they are covered by unit tests, not exercised live.)
 *
 * Inputs (all local, git-ignored):
 *   .env                          EXPO_PUBLIC_*_API_URL (mocks off)
 *   .env.test.local               ACVEL_TEST_EMAIL, ACVEL_TEST_PASSWORD
 *   firebase/google-services-android.json  Firebase Web API key (read here, not duplicated in the app)
 *
 * It signs in through the Firebase Auth REST API, then calls the app's own
 * remote services (same URLs, headers and Zod schemas as the app). The report
 * (.live-report.json) contains only statuses, counts and field names — never
 * tokens, credentials or personal values.
 */
/// <reference types="node" />
import fs from "fs";
import path from "path";

const LIVE = process.env.ACVEL_LIVE === "1";
/** Existing homologation test records (created once by the admin preparation, docs §9.4) — only read here. */
const HML_TICKET_SUBJECT = "[HML] Teste app mobile";
const HML_TICKET_MESSAGE = "[HML] Mensagem de teste da integração do app mobile — pode ser removida.";
const HML_DOCUMENT_NAME = "hml-teste-app-mobile.pdf";
/** ACVEL API hosts: only GET is allowed against them (Firebase sign-in POSTs go to Google, not here). */
const ACVEL_API_HOSTS = ["api-acvel.souaiv.com", "api.appacvel.com.br"];
const requestsByMethod: Record<string, number> = {};
const blockedWrites: string[] = [];
const ROOT = path.resolve(__dirname, "../../..");
const REPORT_FILE = path.join(ROOT, ".live-report.json");

jest.setTimeout(120_000);
jest.mock("expo-file-system", () => ({}));
// The harness signs in through the Firebase REST API; the native SDK is never called here.
jest.mock("@react-native-firebase/app", () => ({ getApp: () => ({}) }));
jest.mock("@react-native-firebase/auth", () => ({ EmailAuthProvider: {} }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "00000000-0000-4000-8000-000000000000" }));
/** The authenticated download is native (expo-file-system); under Jest it is a Node GET written to a temp file. */
jest.mock("../api/file-transfer", () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factory scope */
  const actual = jest.requireActual("../api/file-transfer") as typeof import("../api/file-transfer");
  const nodeFs = require("fs") as typeof import("fs");
  const { apiBaseUrl } = require("@/config/env") as typeof import("@/config/env");
  const { buildUrl } = require("../api/apiClient") as typeof import("../api/apiClient");
  const { authBridge } = require("../api/auth-bridge") as typeof import("../api/auth-bridge");
  const { apiErrorFromResponse } = require("../api/http-errors") as typeof import("../api/http-errors");
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    ...actual,
    downloadAuthenticatedFile: async (api: "auth" | "business" | "rateio", filePath: string, fileName: string) => {
      const os = require("os") as typeof import("os"); // eslint-disable-line @typescript-eslint/no-require-imports
      const response = await fetch(buildUrl(apiBaseUrl(api) ?? "", filePath), { headers: { Authorization: `Bearer ${await authBridge().getIdToken(false)}` } });
      if (!response.ok) throw apiErrorFromResponse(response.status, null, null);
      const target = require("path").join(os.tmpdir(), `live-${fileName.replace(/[^\w.-]+/g, "_")}`); // eslint-disable-line @typescript-eslint/no-require-imports
      nodeFs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
      return `file://${target}`;
    }
  };
});

/**
 * jest-expo replaces the global fetch with Expo's native-backed implementation,
 * which cannot run under Jest. The live harness installs a minimal Node https
 * fetch (method, headers, body, AbortSignal, status, headers.get, text/json/arrayBuffer) so
 * the app's own API client talks to the real servers unchanged.
 */
interface NodeFetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer;
  signal?: AbortSignal;
}

function nodeFetch(url: string, init: NodeFetchInit = {}) {
  /* eslint-disable @typescript-eslint/no-require-imports -- Node built-ins, test harness only */
  const https = require("https") as typeof import("https");
  const http = require("http") as typeof import("http");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const target = new URL(url);
  const method = (init.method ?? "GET").toUpperCase();
  if (ACVEL_API_HOSTS.includes(target.hostname)) {
    requestsByMethod[method] = (requestsByMethod[method] ?? 0) + 1;
    if (method !== "GET") {
      blockedWrites.push(`${method} ${target.pathname}`);
      return Promise.reject(new Error(`read-only live suite: blocked ${method} ${target.pathname}`));
    }
  }
  const transport = target.protocol === "http:" ? http : https;
  const body = init.body === undefined ? undefined : typeof init.body === "string" ? Buffer.from(init.body) : Buffer.from(new Uint8Array(init.body));
  return new Promise<{ ok: boolean; status: number; headers: { get: (name: string) => string | null }; text: () => Promise<string>; json: () => Promise<unknown>; arrayBuffer: () => Promise<ArrayBuffer> }>((resolve, reject) => {
    const request = transport.request(target, { method, headers: { ...(init.headers ?? {}), ...(body ? { "Content-Length": String(body.length) } : {}) } }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => {
        const raw = Buffer.concat(chunks);
        const text = raw.toString("utf8");
        const status = response.statusCode ?? 0;
        resolve({
          ok: status >= 200 && status < 300,
          status,
          headers: { get: (name) => { const value = response.headers[name.toLowerCase()]; return Array.isArray(value) ? (value[0] ?? null) : (value ?? null); } },
          text: () => Promise.resolve(text),
          json: () => Promise.resolve(JSON.parse(text) as unknown),
          arrayBuffer: () => Promise.resolve(new Uint8Array(raw).buffer)
        });
      });
    });
    request.on("error", reject);
    init.signal?.addEventListener("abort", () => request.destroy(new Error("aborted")));
    if (body) request.write(body);
    request.end();
  });
}

if (LIVE) globalThis.fetch = nodeFetch as unknown as typeof fetch;

type Status = "ok" | "fail" | "skipped";
interface CheckResult {
  module: string;
  check: string;
  status: Status;
  detail: string;
  contractWarnings: string[];
}
const results: CheckResult[] = [];
const shapes: Record<string, unknown> = {};

// ── Firebase REST (test harness only) ────────────────────────────────

interface FirebaseSession {
  idToken: string;
  refreshToken: string;
}

function firebaseApiKey(): string {
  const file = path.join(ROOT, "firebase", "google-services-android.json");
  const json = JSON.parse(fs.readFileSync(file, "utf8")) as {
    client?: { client_info?: { android_client_info?: { package_name?: string } }; api_key?: { current_key?: string }[] }[];
  };
  const client = json.client?.find((entry) => entry.client_info?.android_client_info?.package_name === "com.acvel.app") ?? json.client?.[0];
  const key = client?.api_key?.[0]?.current_key;
  if (!key) throw new Error("No api_key in google-services-android.json");
  return key;
}

async function firebaseSignIn(email: string, password: string): Promise<{ ok: true; session: FirebaseSession } | { ok: false; code: string }> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const body = (await response.json()) as { idToken?: string; refreshToken?: string; error?: { message?: string } };
  if (!response.ok || !body.idToken || !body.refreshToken) return { ok: false, code: body.error?.message ?? `HTTP ${response.status}` };
  return { ok: true, session: { idToken: body.idToken, refreshToken: body.refreshToken } };
}

async function firebaseRefresh(refreshToken: string): Promise<string> {
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${firebaseApiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
  });
  const body = (await response.json()) as { id_token?: string };
  if (!body.id_token) throw new Error("refresh failed");
  return body.id_token;
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Field names + types of a JSON payload (values never recorded). */
function shapeOf(value: unknown, depth = 0): unknown {
  if (value === null) return "null";
  if (Array.isArray(value)) return value.length === 0 ? "[] (empty)" : [shapeOf(value[0], depth)];
  if (typeof value === "object") {
    if (depth > 2) return "object";
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, inner]) => [key, shapeOf(inner, depth + 1)]));
  }
  return typeof value;
}

let warnings: string[] = [];
let warnSpy: jest.SpyInstance | null = null;

async function check(module: string, name: string, run: () => Promise<string>): Promise<void> {
  warnings = [];
  try {
    const detail = await run();
    results.push({ module, check: name, status: "ok", detail, contractWarnings: warnings });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
    const status = typeof error === "object" && error !== null && "status" in error ? String((error as { status: unknown }).status) : "";
    const message = error instanceof Error ? error.message : String(error);
    results.push({ module, check: name, status: "fail", detail: [code, status && `HTTP ${status}`, message].filter(Boolean).join(" · "), contractWarnings: warnings });
  }
}

function skip(module: string, name: string, reason: string): void {
  results.push({ module, check: name, status: "skipped", detail: reason, contractWarnings: [] });
}

/** Raw GET (with the app's base URLs) to record the real response shape. */
async function recordShape(label: string, url: string, token: string): Promise<void> {
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text ? "(non-JSON)" : null;
    }
    shapes[label] = { status: response.status, shape: shapeOf(body) };
  } catch (error) {
    shapes[label] = { error: error instanceof Error ? error.message : "request failed" };
  }
}

// ── Suite ─────────────────────────────────────────────────────────────

(LIVE ? describe : describe.skip)("LIVE ACVEL API validation", () => {
  let session: FirebaseSession;
  let currentToken = "";

  beforeAll(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation((message: unknown) => {
      warnings.push(String(message));
    });
    jest.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterAll(() => {
    warnSpy?.mockRestore();
    fs.writeFileSync(REPORT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), readOnly: true, requestsByMethod, blockedWrites, results, shapes }, null, 2));
  });

  it("runs the end-to-end validation", async () => {
    const email = process.env.ACVEL_TEST_EMAIL ?? "";
    const password = process.env.ACVEL_TEST_PASSWORD ?? "";
    expect(email && password).toBeTruthy();

    /* eslint-disable @typescript-eslint/no-require-imports -- modules must load after env is set */
    const { config, configResult } = require("@/config/env") as typeof import("@/config/env");
    const { registerAuthBridge } = require("../api/auth-bridge") as typeof import("../api/auth-bridge");
    const { fetchMe } = require("../remote/me") as typeof import("../remote/me");
    const { remoteAccountService } = require("../remote/account.remote") as typeof import("../remote/account.remote");
    const { remoteDashboardService } = require("../remote/dashboard.remote") as typeof import("../remote/dashboard.remote");
    const { remoteResidenceService } = require("../remote/residence.remote") as typeof import("../remote/residence.remote");
    const { remoteInvoiceService } = require("../remote/invoice.remote") as typeof import("../remote/invoice.remote");
    const { paymentScreenGate } = require("@/features/invoices/payment-gate") as typeof import("@/features/invoices/payment-gate");
    const { remoteEconomyService } = require("../remote/economy.remote") as typeof import("../remote/economy.remote");
    const { remoteNotificationService } = require("../remote/notification.remote") as typeof import("../remote/notification.remote");
    const { remoteSupportService } = require("../remote/support.remote") as typeof import("../remote/support.remote");
    const { remoteBenefitsService } = require("../remote/benefits.remote") as typeof import("../remote/benefits.remote");
    const { remoteGeneratorService } = require("../remote/generator.remote") as typeof import("../remote/generator.remote");
    /* eslint-enable @typescript-eslint/no-require-imports */

    expect(configResult.ok).toBe(true);
    expect(config.useMocks).toBe(false);

    // ── 1. Auth ──
    await check("Auth", "login failure (wrong password)", async () => {
      const failed = await firebaseSignIn(email, `${password}-wrong`);
      if (failed.ok) throw new Error("wrong password was accepted");
      return `Firebase rejected: ${failed.code}`;
    });
    const signed = await firebaseSignIn(email, password);
    if (!signed.ok) throw new Error(`Test account sign-in failed: ${signed.code}`);
    session = signed.session;
    currentToken = session.idToken;
    let unauthorizedCalls = 0;
    registerAuthBridge({
      getIdToken: async (force) => {
        if (force) currentToken = await firebaseRefresh(session.refreshToken);
        return currentToken;
      },
      onUnauthorized: () => {
        unauthorizedCalls += 1;
      }
    });
    results.push({ module: "Auth", check: "login success (Firebase ID token)", status: "ok", detail: "token issued (not logged)", contractWarnings: [] });

    await check("Auth", "GET /v1/auth/me with Bearer token", async () => {
      const me = await fetchMe();
      return `userType=${me.identity.userType ?? "null"} status=${me.identity.status} roles=${me.identity.roles.length} permissions=${me.identity.permissions.length} consumerId=${me.identity.consumerId ? "set" : "null"} onboardingCompleted=${String(me.identity.onboardingCompleted)}`;
    });
    await recordShape("auth GET /v1/auth/me", `${config.authApiUrl}/v1/auth/me`, currentToken);

    await check("Auth", "expired/invalid token → refresh once → retry", async () => {
      currentToken = "invalid.token.value";
      const me = await fetchMe();
      if (currentToken === "invalid.token.value" || !me.identity.userId) throw new Error("token was not refreshed");
      return `recovered after forced refresh (onUnauthorized calls: ${unauthorizedCalls})`;
    });

    // ── 2. Profile ──
    await check("Profile", "getProfile (auth/me + consumidores/me)", async () => {
      const profile = await remoteAccountService.getProfile();
      return `onboardingCompleted=${String(profile.onboardingCompleted)} personType=${profile.personType} document=${profile.document ? "set" : "empty"} phone=${profile.phone ? "set" : "null"} referralCode=${profile.referralCode ? "set" : "empty"} billing=${profile.billingPreference}`;
    });
    await recordShape("business GET /v1/consumidores/me", `${config.businessApiUrl}/v1/consumidores/me`, currentToken);
    await check("Profile", "GET delete-request (open request?)", async () => {
      const request = await remoteAccountService.getDeletionRequest();
      return request ? `open request status=${request.status}` : "none (404)";
    });

    // ── 3. Dashboard ──
    await check("Dashboard", "getSummary (composed)", async () => {
      const summary = await remoteDashboardService.getSummary();
      return `units=${summary.unitsCount} status=${summary.accountStatus} nextInvoice=${summary.nextInvoice ? summary.nextInvoice.status : "none"} savingsSeries=${summary.savings.series.length} totalSavings>0=${String(summary.savings.totalSavings > 0)} avg%=${summary.savings.averagePercent} energyMonth=${summary.energy.competencia || "none"} alerts=${summary.alerts.map((alert) => alert.id.split("-")[0]).join(",") || "none"} unread=${summary.unreadNotifications}`;
    });
    await recordShape("business GET /v1/consumidores/me/rateio-snapshot", `${config.businessApiUrl}/v1/consumidores/me/rateio-snapshot`, currentToken);

    // ── 4. Units ──
    let firstUnitId: string | null = null;
    await check("Units", "list (registrations + snapshot + billing mode)", async () => {
      const units = await remoteResidenceService.list();
      firstUnitId = units[0]?.id ?? null;
      return `count=${units.length} editable=${units.filter((unit) => unit.editable).length} statuses=${[...new Set(units.map((unit) => unit.status))].join(",") || "none"}`;
    });
    await recordShape("business GET /v1/consumidores/me/ucs", `${config.businessApiUrl}/v1/consumidores/me/ucs`, currentToken);
    await recordShape("rateio GET /v1/ucs/minhas-ucs", `${config.rateioApiUrl}/v1/ucs/minhas-ucs`, currentToken);
    if (firstUnitId) await check("Units", "detail", async () => `status=${(await remoteResidenceService.get(firstUnitId ?? "")).status}`);
    else skip("Units", "detail", "account has no units");
    await check("Units", "utilities (concessionárias)", async () => `count=${(await remoteResidenceService.listUtilities()).length}`);
    await check("Units", "creation availability (dg_status)", async () => {
      const availability = await remoteResidenceService.getCreationAvailability();
      return `canCreate=${String(availability.canCreate)}`;
    });

    // ── 5–7. Invoices, Pix, Boleto ──
    let firstInvoiceId: string | null = null;
    let openInvoiceId: string | null = null;
    let paidInvoiceId: string | null = null;
    let noChargeInvoiceId: string | null = null;
    await check("Invoices", "list (12 months, all statuses)", async () => {
      const invoices = await remoteInvoiceService.getInvoices({ status: "ALL", periodMonths: 12 });
      firstInvoiceId = invoices[0]?.id ?? null;
      paidInvoiceId = invoices.find((invoice) => invoice.status === "PAGO")?.id ?? null;
      noChargeInvoiceId = invoices.find((invoice) => invoice.status === "SEM_COBRANCA_ACVEL")?.id ?? null;
      openInvoiceId = invoices.find((invoice) => invoice.status === "PENDENTE" || invoice.status === "ATRASADO")?.id ?? null;
      return `count=${invoices.length} statuses=${[...new Set(invoices.map((invoice) => invoice.status))].join(",") || "none"}`;
    });
    await recordShape("rateio GET /v1/faturas/me", `${config.rateioApiUrl}/v1/faturas/me?page=1&perPage=5&per_page=5`, currentToken);
    if (firstInvoiceId) {
      await check("Invoices", "detail", async () => {
        const detail = await remoteInvoiceService.getInvoice(firstInvoiceId ?? "");
        return `origin=${detail.origin} status=${detail.status} items=${detail.items.length} billing=${detail.billingMode} kWh=${detail.consumptionKwh ?? "null"}/${detail.compensatedKwh ?? "null"} pdfAvailable=${String(detail.pdfAvailable)}`;
      });
      await recordShape("rateio GET /v1/faturas/{id}", `${config.rateioApiUrl}/v1/faturas/${encodeURIComponent(firstInvoiceId)}`, currentToken);
      await recordShape("rateio GET /v1/pagamentos/cobrancas?fatura_id", `${config.rateioApiUrl}/v1/pagamentos/cobrancas?fatura_id=${encodeURIComponent(firstInvoiceId)}`, currentToken);
    } else skip("Invoices", "detail", "account has no invoices");
    if (paidInvoiceId) {
      let pdfAvailable = false;
      await check("Invoices", "detail (paid ACVEL invoice)", async () => {
        const detail = await remoteInvoiceService.getInvoice(paidInvoiceId ?? "");
        pdfAvailable = detail.pdfAvailable;
        return `origin=${detail.origin} status=${detail.status} items=${detail.items.length} kWh=${detail.consumptionKwh ?? "null"}/${detail.compensatedKwh ?? "null"} paidAt=${detail.paidAt ? "set" : "null"} pdfAvailable=${String(detail.pdfAvailable)}`;
      });
      // Same path as remoteInvoiceService.downloadInvoicePdf (the download itself needs the native file system).
      await check("Invoices", "ACVEL PDF (GET /v1/faturas/{id}/pdf)", async () => {
        if (!pdfAvailable) throw new Error("PDF action not exposed for a paid ACVEL invoice");
        const response = await fetch(`${config.rateioApiUrl}/v1/faturas/${encodeURIComponent(paidInvoiceId ?? "")}/pdf`, { headers: { Authorization: `Bearer ${currentToken}` } });
        const head = (await response.text()).slice(0, 4);
        if (!response.ok || head !== "%PDF") throw new Error(`HTTP ${response.status} type=${response.headers.get("content-type") ?? "none"}`);
        return `HTTP ${response.status} type=${response.headers.get("content-type") ?? "none"} body=%PDF`;
      });
      // Deep-link edge case: invoice PAGA while the backend charge is still PENDENTE.
      await check("Boleto", "paid invoice via deep link (gate → 'Fatura já paga')", async () => {
        const boleto = await remoteInvoiceService.getExistingBoleto(paidInvoiceId ?? "");
        const gate = paymentScreenGate(boleto.invoiceStatus);
        if (gate !== "ALREADY_PAID") throw new Error(`gate=${gate}`);
        return `invoice=${boleto.invoiceStatus} charge=${boleto.status} (backend status kept) gate=${gate}`;
      });
      await check("Pix", "paid invoice via deep link (gate → 'Fatura já paga')", async () => {
        const pix = await remoteInvoiceService.getExistingPix(paidInvoiceId ?? "");
        const gate = paymentScreenGate(pix.invoiceStatus);
        if (gate !== "ALREADY_PAID") throw new Error(`gate=${gate}`);
        return `invoice=${pix.invoiceStatus} charge=${pix.status} (backend status kept) gate=${gate}`;
      });
    } else skip("Invoices", "detail (paid ACVEL invoice)", "account has no paid invoice");
    if (noChargeInvoiceId) {
      await check("Pix", "invoice without charge (charge lookup 404 → no charge)", async () => {
        const pix = await remoteInvoiceService.getExistingPix(noChargeInvoiceId ?? "");
        return `no error; invoice=${pix.invoiceStatus} status=${pix.status} payload=${pix.emvCode ? "present" : "empty"}`;
      });
      await check("Boleto", "invoice without charge (charge lookup 404 → no charge)", async () => {
        const boleto = await remoteInvoiceService.getExistingBoleto(noChargeInvoiceId ?? "");
        return `no error; status=${boleto.status} line=${boleto.digitableLine ? "present" : "empty"}`;
      });
    } else skip("Pix", "invoice without charge", "no invoice without ACVEL charge");
    await check("Invoices", "payment history", async () => {
      const payments = await remoteInvoiceService.getPaymentHistory();
      return `count=${payments.length} withMethod=${payments.filter((payment) => payment.method).length}`;
    });
    if (!openInvoiceId) {
      // Open invoices outside the 12-month list window are still reachable from the dashboard ("próxima fatura").
      await check("Invoices", "open invoice (dashboard next invoice)", async () => {
        const next = (await remoteDashboardService.getSummary()).nextInvoice;
        openInvoiceId = next?.id ?? null;
        return next ? `found via dashboard: status=${next.status} competencia=${next.competencia} due=${next.dueDate} (not in the 12-month list)` : "none";
      });
    }
    if (openInvoiceId) {
      await check("Invoices", "open invoice detail", async () => {
        const detail = await remoteInvoiceService.getInvoice(openInvoiceId ?? "");
        return `status=${detail.status} origin=${detail.origin} amount>0=${String(detail.amount > 0)} due=${detail.dueDate} payable=${String(detail.status === "PENDENTE" || detail.status === "ATRASADO")} pdfAvailable=${String(detail.pdfAvailable)}`;
      });
      await check("Pix", "charge (QR payload + expiry)", async () => {
        const pix = await remoteInvoiceService.getExistingPix(openInvoiceId ?? "");
        const gate = paymentScreenGate(pix.invoiceStatus, pix.status);
        const screen = gate === "ALREADY_PAID" ? "Fatura já paga" : pix.status === "CONFIRMADO" ? "pagamento confirmado" : pix.status === "EXPIRADO" ? "Código Pix expirado" : pix.status === "FALHOU" || pix.status === "PROCESSANDO" || !pix.emvCode ? "Pix ainda não disponível" : "QR + copia e cola";
        return `invoice=${pix.invoiceStatus} charge=${pix.status} payload=${pix.emvCode ? "present" : "empty"} expiresAt=${pix.expiresAt ? "set" : "null"} gate=${gate} → screen: ${screen}`;
      });
      await check("Pix", "status poll", async () => {
        const status = await remoteInvoiceService.getPaymentStatus(openInvoiceId ?? "");
        return `status=${status} → polling ${status === "AGUARDANDO" || status === "PROCESSANDO" ? "continues (4 s)" : "stops"}`;
      });
      await check("Boleto", "charge (line + barcode)", async () => {
        const boleto = await remoteInvoiceService.getExistingBoleto(openInvoiceId ?? "");
        const gate = paymentScreenGate(boleto.invoiceStatus);
        const screen = gate === "ALREADY_PAID" ? "Fatura já paga" : boleto.status === "CONFIRMADO" ? "Fatura paga" : boleto.status === "FALHOU" || boleto.status === "PROCESSANDO" || !boleto.digitableLine ? "Boleto ainda não disponível" : "linha digitável + copiar/compartilhar";
        return `invoice=${boleto.invoiceStatus} charge=${boleto.status} line=${boleto.digitableLine.length} digits barcode=${boleto.barcode.length} digits due=${boleto.dueDate} pdf=${boleto.pdfUrl ? "https" : "none"} → screen: ${screen}`;
      });
      await recordShape("rateio GET /v1/pagamentos/cobrancas?fatura_id (open invoice)", `${config.rateioApiUrl}/v1/pagamentos/cobrancas?fatura_id=${encodeURIComponent(openInvoiceId)}`, currentToken);
    } else {
      skip("Pix", "charge", "no open invoice on the test account");
      skip("Boleto", "charge", "no open invoice on the test account");
    }

    // ── 8. Economy ──
    await check("Economy", "overview (snapshot por_competencia)", async () => {
      const economy = await remoteEconomyService.getOverview();
      return `months=${economy.months.length} startedAt=${economy.startedAt || "none"} avg%=${economy.averagePercent} reduction12m%=${economy.indicators.reductionPercent12Months} trend=${economy.indicators.consumptionTrendPercent ?? "null"}`;
    });

    // ── 9. Documents ──
    let firstDocumentId: string | null = null;
    await check("Documents", "list", async () => {
      const documents = await remoteAccountService.listDocuments();
      firstDocumentId = (documents.find((doc) => doc.name === HML_DOCUMENT_NAME) ?? documents[0])?.id ?? null;
      return `count=${documents.length} kinds=${[...new Set(documents.map((doc) => doc.kind))].join(",") || "none"} statuses=${[...new Set(documents.map((doc) => doc.status))].join(",") || "none"}`;
    });
    if (firstDocumentId) {
      await check("Documents", "signed URL + open", async () => {
        const url = await remoteAccountService.getDocumentUrl(firstDocumentId ?? "");
        if (url.startsWith("https://")) {
          const response = await fetch(url);
          const head = (await response.text()).slice(0, 5);
          return `public https URL → HTTP ${response.status} body=${head === "%PDF-" ? "%PDF" : "other"}`;
        }
        if (!url.startsWith("file://")) throw new Error("unexpected URL");
        const local = url.slice("file://".length);
        const head = fs.readFileSync(local).subarray(0, 5).toString();
        fs.rmSync(local, { force: true });
        return `API-relative signed path → downloaded with session → local file (${head === "%PDF-" ? "%PDF" : "other"}), opened via share sheet`;
      });
      await check("Documents", "status mapping", async () => {
        const doc = (await remoteAccountService.listDocuments()).find((item) => item.id === firstDocumentId);
        return doc ? `kind=${doc.kind} status=${doc.status} name=${doc.name === HML_DOCUMENT_NAME ? "HML test PDF" : "other"} uploadedAt=${doc.uploadedAt ? "set" : "null"}` : "not found";
      });
    }
    else skip("Documents", "signed URL", "account has no documents");

    // ── 10. Notifications ──
    await check("Notifications", "list", async () => {
      const list = await remoteNotificationService.list();
      return `count=${list.length} unread=${list.filter((item) => !item.read).length} withAction=${list.filter((item) => item.action).length} categories=${[...new Set(list.map((item) => item.category))].join(",") || "none"}`;
    });
    await recordShape("business GET /v1/notificacoes", `${config.businessApiUrl}/v1/notificacoes?perPage=3`, currentToken);
    await check("Notifications", "unread count", async () => `count=${await remoteNotificationService.unreadCount()}`);
    await check("Notifications", "preferences", async () => `editable=${(await remoteNotificationService.getSettings()).editable.join(",")}`);
    await recordShape("business GET /v1/notificacoes/preferencias", `${config.businessApiUrl}/v1/notificacoes/preferencias`, currentToken);

    // ── 11. Support ──
    let firstTicketId: string | null = null;
    await check("Support", "help center (WhatsApp config)", async () => `whatsapp=${(await remoteSupportService.getHelpCenter()).contact.whatsapp ? "set" : "null"}`);
    await check("Support", "tickets", async () => {
      const tickets = await remoteSupportService.list();
      firstTicketId = (tickets.find((ticket) => ticket.subject === HML_TICKET_SUBJECT) ?? tickets[0])?.id ?? null;
      return `count=${tickets.length} withProtocol=${tickets.filter((ticket) => ticket.protocol).length}`;
    });
    await recordShape("business GET /v1/support/tickets", `${config.businessApiUrl}/v1/support/tickets`, currentToken);
    if (firstTicketId) {
      await check("Support", "ticket + messages", async () => {
        const ticket = await remoteSupportService.get(firstTicketId ?? "");
        const message = ticket.messages[0];
        return `subject=${ticket.subject === HML_TICKET_SUBJECT ? "HML test" : "other"} status=${ticket.status} category=${ticket.category} messages=${ticket.messages.length} first: sender=${message?.sender ?? "-"} body=${message ? (message.body === HML_TICKET_MESSAGE ? "matches" : "differs") : "-"} createdAt=${message?.createdAt && !message.createdAt.startsWith("1970") ? "set" : "missing"}`;
      });
      await recordShape("business GET /v1/support/tickets/{id}", `${config.businessApiUrl}/v1/support/tickets/${encodeURIComponent(firstTicketId)}`, currentToken);
      await recordShape("business GET /v1/support/tickets/{id}/messages", `${config.businessApiUrl}/v1/support/tickets/${encodeURIComponent(firstTicketId)}/messages`, currentToken);
    }
    else skip("Support", "ticket + messages", "account has no tickets");

    // ── 12. Benefits ──
    await check("Benefits", "overview (wallet, statement, referral, rewards)", async () => {
      const overview = await remoteBenefitsService.getOverview();
      return `balance=${overview.pointsBalance} entries=${overview.recentEntries.length} rewards=${overview.rewards.length} referralCode=${overview.referral.code ? "set" : "empty"}`;
    });
    // Portal-parity reads (§15): statement, Meus resgates, reward detail, referral program, generator request.
    await check("Benefits", "points statement (page 1)", async () => {
      const page = await remoteBenefitsService.getPointsStatement(1);
      return `entries=${page.entries.length} page=${page.page}/${page.totalPages} balance=${page.balance}`;
    });
    await check("Benefits", "my redemptions (GET /v1/pedidos)", async () => {
      const list = await remoteBenefitsService.getRedemptions();
      return `count=${list.length} statuses=${[...new Set(list.map((item) => item.status))].join(",") || "none"} cancellable=${list.filter((item) => item.status === "PENDENTE").length}`;
    });
    const firstRewardId = (await remoteBenefitsService.getOverview().catch(() => null))?.rewards[0]?.id ?? null;
    if (firstRewardId) {
      await check("Benefits", "reward detail (GET /v1/produtos/{id})", async () => {
        const { reward, pointsBalance } = await remoteBenefitsService.getReward(firstRewardId);
        return `available=${String(reward.available)} price>0=${String(reward.pointsPrice > 0)} longDescription=${reward.longDescription ? "set" : "empty"} balance=${pointsBalance}`;
      });
    } else skip("Benefits", "reward detail", "no consumer reward in the catalogue");
    await check("Benefits", "referral program (rules + referred list)", async () => {
      const program = await remoteBenefitsService.getReferralProgram();
      return `active=${String(program.active)} rewardPoints=${program.rewardPoints} limit=${program.monthlyLimit} used=${program.usedThisMonth} referred=${program.referred.length} link=${program.link ? "set" : "empty"}`;
    });
    await check("Generator", "Quero ser gerador — access + my requests", async () => {
      const access = await remoteGeneratorService.getAccess();
      return `isGenerator=${String(access.isGenerator)} requests=${access.requests.length} open=${access.openRequest ? access.openRequest.status : "none"}`;
    });
    for (const [label, url] of [
      ["business GET /v1/gerador-interest-requests/me", `${config.businessApiUrl}/v1/gerador-interest-requests/me`],
      ["business GET /v1/pedidos", `${config.businessApiUrl}/v1/pedidos?page=1&per_page=5`],
      ["business GET /v1/consumidores/me/indicados", `${config.businessApiUrl}/v1/consumidores/me/indicados`],
      ["business GET /v1/pedidos/me/context", `${config.businessApiUrl}/v1/pedidos/me/context`],
      ["business GET /v1/pontos/me", `${config.businessApiUrl}/v1/pontos/me?page=1&perPage=3`],
      ["business GET /v1/consumidores/me/indicacao", `${config.businessApiUrl}/v1/consumidores/me/indicacao`]
    ] as const) {
      await recordShape(label, url, currentToken);
    }

    // ── Test safety: the live run creates no data ──
    await check("Test safety", "live suite made no write request to the ACVEL APIs", async () => {
      if (blockedWrites.length > 0) throw new Error(`blocked: ${blockedWrites.join(", ")}`);
      return `requests by method: ${JSON.stringify(requestsByMethod)}`;
    });

    const failures = results.filter((result) => result.status === "fail");
    // The suite reports; it fails only if login itself failed (checked above).
    expect(results.length).toBeGreaterThan(0);
    if (failures.length > 0) console.log(`${failures.length} live check(s) failed — see .live-report.json`);
  });
});
