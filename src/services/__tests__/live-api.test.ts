/**
 * LIVE validation against the real ACVEL APIs (opt-in, never part of `npm test`).
 *
 *   npm run test:live            → read-only checks (auth + all 12 modules)
 *   npm run test:live -- --writes → also runs upload checks (creates real documents!)
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
const WRITES = process.env.ACVEL_LIVE_WRITES === "1";
const ROOT = path.resolve(__dirname, "../../..");
const REPORT_FILE = path.join(ROOT, ".live-report.json");

jest.setTimeout(120_000);
jest.mock("expo-file-system", () => ({}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "00000000-0000-4000-8000-000000000000" }));

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
    fs.writeFileSync(REPORT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), writes: WRITES, results, shapes }, null, 2));
  });

  it("runs the end-to-end validation", async () => {
    const email = process.env.ACVEL_TEST_EMAIL ?? "";
    const password = process.env.ACVEL_TEST_PASSWORD ?? "";
    expect(email && password).toBeTruthy();

    /* eslint-disable @typescript-eslint/no-require-imports -- modules must load after env is set */
    const { config, configResult } = require("@/config/env") as typeof import("@/config/env");
    const { registerAuthBridge } = require("../api/auth-bridge") as typeof import("../api/auth-bridge");
    const { apiRequest } = require("../api/apiClient") as typeof import("../api/apiClient");
    const { fetchMe } = require("../remote/me") as typeof import("../remote/me");
    const { remoteAccountService } = require("../remote/account.remote") as typeof import("../remote/account.remote");
    const { remoteDashboardService } = require("../remote/dashboard.remote") as typeof import("../remote/dashboard.remote");
    const { remoteResidenceService } = require("../remote/residence.remote") as typeof import("../remote/residence.remote");
    const { remoteInvoiceService } = require("../remote/invoice.remote") as typeof import("../remote/invoice.remote");
    const { remoteEconomyService } = require("../remote/economy.remote") as typeof import("../remote/economy.remote");
    const { remoteNotificationService } = require("../remote/notification.remote") as typeof import("../remote/notification.remote");
    const { remoteSupportService } = require("../remote/support.remote") as typeof import("../remote/support.remote");
    const { remoteBenefitsService } = require("../remote/benefits.remote") as typeof import("../remote/benefits.remote");
    const { z } = require("zod") as typeof import("zod");
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
      return `personType=${profile.personType} document=${profile.document ? "set" : "empty"} phone=${profile.phone ? "set" : "null"} referralCode=${profile.referralCode ? "set" : "empty"} billing=${profile.billingPreference}`;
    });
    await recordShape("business GET /v1/consumidores/me", `${config.businessApiUrl}/v1/consumidores/me`, currentToken);
    await check("Profile", "GET delete-request (open request?)", async () => {
      const request = await remoteAccountService.getDeletionRequest();
      return request ? `open request status=${request.status}` : "none (404)";
    });

    // ── 3. Dashboard ──
    await check("Dashboard", "getSummary (composed)", async () => {
      const summary = await remoteDashboardService.getSummary();
      return `units=${summary.unitsCount} status=${summary.accountStatus} nextInvoice=${summary.nextInvoice ? summary.nextInvoice.status : "none"} savingsSeries=${summary.savings.series.length} totalSavings>0=${String(summary.savings.totalSavings > 0)} energyMonth=${summary.energy.competencia || "none"} alerts=${summary.alerts.map((alert) => alert.id.split("-")[0]).join(",") || "none"} unread=${summary.unreadNotifications}`;
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
    await check("Invoices", "list (12 months, all statuses)", async () => {
      const invoices = await remoteInvoiceService.list({ status: "ALL", periodMonths: 12 });
      firstInvoiceId = invoices[0]?.id ?? null;
      openInvoiceId = invoices.find((invoice) => invoice.status === "PENDENTE" || invoice.status === "ATRASADO")?.id ?? null;
      return `count=${invoices.length} statuses=${[...new Set(invoices.map((invoice) => invoice.status))].join(",") || "none"}`;
    });
    await recordShape("rateio GET /v1/faturas/me", `${config.rateioApiUrl}/v1/faturas/me?page=1&perPage=5&per_page=5`, currentToken);
    if (firstInvoiceId) {
      await check("Invoices", "detail", async () => {
        const detail = await remoteInvoiceService.get(firstInvoiceId ?? "");
        return `items=${detail.items.length} billing=${detail.billingMode} kWh=${detail.consumptionKwh ?? "null"}/${detail.compensatedKwh ?? "null"} pdfAvailable=${String(detail.pdfAvailable)}`;
      });
      await recordShape("rateio GET /v1/faturas/{id}", `${config.rateioApiUrl}/v1/faturas/${encodeURIComponent(firstInvoiceId)}`, currentToken);
      await recordShape("rateio GET /v1/pagamentos/cobrancas?fatura_id", `${config.rateioApiUrl}/v1/pagamentos/cobrancas?fatura_id=${encodeURIComponent(firstInvoiceId)}`, currentToken);
    } else skip("Invoices", "detail", "account has no invoices");
    await check("Invoices", "payment history", async () => {
      const payments = await remoteInvoiceService.listPayments();
      return `count=${payments.length} withMethod=${payments.filter((payment) => payment.method).length}`;
    });
    if (openInvoiceId) {
      await check("Pix", "charge (QR payload + expiry)", async () => {
        const pix = await remoteInvoiceService.getPixCharge(openInvoiceId ?? "");
        return `status=${pix.status} payload=${pix.emvCode ? "present" : "empty"} expiresAt=${pix.expiresAt ? "set" : "null"}`;
      });
      await check("Pix", "status poll", async () => `status=${await remoteInvoiceService.getChargeStatus(openInvoiceId ?? "")}`);
      await check("Boleto", "charge (line + barcode)", async () => {
        const boleto = await remoteInvoiceService.getBoleto(openInvoiceId ?? "");
        return `status=${boleto.status} line=${boleto.digitableLine.length} digits barcode=${boleto.barcode.length} digits pdf=${boleto.pdfUrl ? "https" : "none"}`;
      });
    } else {
      skip("Pix", "charge", "no open invoice on the test account");
      skip("Boleto", "charge", "no open invoice on the test account");
    }

    // ── 8. Economy ──
    await check("Economy", "overview (snapshot por_competencia)", async () => {
      const economy = await remoteEconomyService.getOverview();
      return `months=${economy.months.length} startedAt=${economy.startedAt || "none"} avg%=${economy.averagePercent} trend=${economy.indicators.consumptionTrendPercent ?? "null"}`;
    });

    // ── 9. Documents ──
    let firstDocumentId: string | null = null;
    await check("Documents", "list", async () => {
      const documents = await remoteAccountService.listDocuments();
      firstDocumentId = documents[0]?.id ?? null;
      return `count=${documents.length} kinds=${[...new Set(documents.map((doc) => doc.kind))].join(",") || "none"} statuses=${[...new Set(documents.map((doc) => doc.status))].join(",") || "none"}`;
    });
    if (firstDocumentId) await check("Documents", "signed URL", async () => ((await remoteAccountService.getDocumentUrl(firstDocumentId ?? "")).startsWith("https://") ? "https signed URL returned" : "unexpected URL"));
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
      firstTicketId = tickets[0]?.id ?? null;
      return `count=${tickets.length} withProtocol=${tickets.filter((ticket) => ticket.protocol).length}`;
    });
    await recordShape("business GET /v1/support/tickets", `${config.businessApiUrl}/v1/support/tickets`, currentToken);
    if (firstTicketId) await check("Support", "ticket + messages", async () => `messages=${(await remoteSupportService.get(firstTicketId ?? "")).messages.length}`);
    else skip("Support", "ticket + messages", "account has no tickets");

    // ── 12. Benefits ──
    await check("Benefits", "overview (wallet, statement, referral, rewards)", async () => {
      const overview = await remoteBenefitsService.getOverview();
      return `balance=${overview.pointsBalance} entries=${overview.recentEntries.length} rewards=${overview.rewards.length} referralCode=${overview.referral.code ? "set" : "empty"}`;
    });
    for (const [label, url] of [
      ["business GET /v1/pedidos/me/context", `${config.businessApiUrl}/v1/pedidos/me/context`],
      ["business GET /v1/pontos/me", `${config.businessApiUrl}/v1/pontos/me?page=1&perPage=3`],
      ["business GET /v1/consumidores/me/indicacao", `${config.businessApiUrl}/v1/consumidores/me/indicacao`]
    ] as const) {
      await recordShape(label, url, currentToken);
    }

    // ── Uploads (opt-in: creates real documents) ──
    if (!WRITES) {
      skip("Uploads", "PDF / image upload", "read-only run (use --writes)");
    } else {
      const { documentSignedUrl } = require("../remote/documents") as typeof import("../remote/documents"); // eslint-disable-line @typescript-eslint/no-require-imports
      const upload = async (fileName: string, mimeType: string, bytes: Buffer, tipo: "OUTRO") => {
        const consumer = await remoteAccountService.getProfile();
        const presign = await apiRequest({
          api: "business",
          method: "POST",
          path: "/v1/documentos/presign-upload",
          schema: z.object({ upload_url: z.string(), upload_method: z.string().default("PUT"), arquivo_path: z.string() }),
          body: { proprietario_tipo: "CONSUMIDOR", consumidor_id: consumer.consumerId, tipo, arquivo_nome: fileName, arquivo_tamanho: bytes.length, arquivo_mime_type: mimeType, arquivo_checksum: `${Date.now()}-${bytes.length}` }
        });
        const target = /^https?:\/\//.test(presign.upload_url) ? presign.upload_url : `${config.businessApiUrl}${presign.upload_url.replace(/^\/api(?=\/v1\/)/, "")}`;
        const headers: Record<string, string> = { "Content-Type": mimeType };
        if (!/^https?:\/\//.test(presign.upload_url)) headers.Authorization = `Bearer ${currentToken}`;
        const put = await fetch(target, { method: presign.upload_method.toUpperCase(), headers, body: new Uint8Array(bytes).buffer });
        if (!put.ok) throw new Error(`upload PUT failed: HTTP ${put.status}`);
        const confirmed = await apiRequest({
          api: "business",
          method: "POST",
          path: "/v1/documentos/confirm-upload",
          schema: z.object({ id: z.string(), status_validacao: z.string().nullish() }),
          body: { proprietario_tipo: "CONSUMIDOR", consumidor_id: consumer.consumerId, tipo, descricao: "Teste de integração do app (pode ser removido)", arquivo_path: presign.arquivo_path, arquivo_nome: fileName, arquivo_tamanho: bytes.length, arquivo_mime_type: mimeType, arquivo_checksum: `${Date.now()}-${bytes.length}` }
        });
        const url = await documentSignedUrl(confirmed.id);
        return `document ${confirmed.id.slice(0, 8)}… status=${confirmed.status_validacao ?? "null"} signedUrl=${url.startsWith("https://") ? "https" : "?"}`;
      };
      const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
      const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
      await check("Uploads", "PDF upload (presign → PUT → confirm → signed URL)", () => upload("teste-app.pdf", "application/pdf", pdf, "OUTRO"));
      await check("Uploads", "image upload (PNG)", () => upload("teste-app.png", "image/png", png, "OUTRO"));
    }

    const failures = results.filter((result) => result.status === "fail");
    // The suite reports; it fails only if login itself failed (checked above).
    expect(results.length).toBeGreaterThan(0);
    if (failures.length > 0) console.log(`${failures.length} live check(s) failed — see .live-report.json`);
  });
});
