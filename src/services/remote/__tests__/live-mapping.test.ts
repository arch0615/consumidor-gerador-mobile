import { paymentScreenGate } from "@/features/invoices/payment-gate";
import { AppError } from "@/utils/app-error";
import { api } from "../../api/apiClient";
import { baselineWithoutAcvel, hasAcvelInvoicePdf, isConsumerOnboarded, snapshotSchema, type Consumer } from "../business";
import { remoteInvoiceService } from "../invoice.remote";
import { downloadAuthenticatedFile } from "../../api/file-transfer";
import { openableDocumentUrl } from "../documents";
import { remoteSupportService } from "../support.remote";

// Fixes found by the live validation against the homologation backend (docs/live-api-validation.md §7.1).

jest.mock("@/config/env", () => ({ config: { apiTimeoutMs: 1000 }, apiBaseUrl: () => "https://api.test" }));
jest.mock("../../api/apiClient", () => ({ api: { get: jest.fn() } }));
jest.mock("../../api/file-transfer", () => ({ downloadAuthenticatedFile: jest.fn() }));

const get = api.get as jest.Mock;

const consumer = (overrides: Partial<Consumer>): Consumer =>
  ({ id: "c1", status: "PENDENTE", aprovado_em: null, compensando: false, ...overrides }) as Consumer;

describe("M1 — effective onboarding state", () => {
  it("treats approved or compensating consumers as onboarded", () => {
    expect(isConsumerOnboarded(consumer({ status: "APROVADO" }))).toBe(true);
    expect(isConsumerOnboarded(consumer({ aprovado_em: "2025-09-01T00:00:00Z" }))).toBe(true);
    expect(isConsumerOnboarded(consumer({ compensando: true }))).toBe(true);
  });

  it("keeps consumers still in registration (or without a record) in onboarding", () => {
    expect(isConsumerOnboarded(consumer({ status: "EM_ANALISE" }))).toBe(false);
    expect(isConsumerOnboarded(null)).toBe(false);
  });
});

describe("M4 — economy baseline (sem ACVEL)", () => {
  const month = { valor_distribuidora: 100, valor_total: 300, economia_reais: 60 };

  it("uses the billing engine value when it is positive", () => {
    expect(baselineWithoutAcvel({ ...month, total_sem_acvel: 500 })).toBe(500);
  });

  it("falls back to distribuidora + ACVEL + economia when the engine value is 0 or missing", () => {
    expect(baselineWithoutAcvel({ ...month, total_sem_acvel: 0 })).toBe(460);
    expect(baselineWithoutAcvel({ ...month, total_sem_acvel: null })).toBe(460);
  });
});

describe("M3 — invoice PDF availability", () => {
  it("exposes the PDF only for ACVEL invoices linked to /v1/faturas/{id}/pdf", () => {
    expect(hasAcvelInvoicePdf({ id: "f1", origem: "ACVEL", pdf_url: "/v1/faturas/f1/pdf" })).toBe(true);
    expect(hasAcvelInvoicePdf({ id: "f2", origem: "DIGITAL_GRID", pdf_url: "/v1/faturas-distribuidora/d2/download" })).toBe(false);
    expect(hasAcvelInvoicePdf({ id: "f3", origem: "ACVEL", pdf_url: null })).toBe(false);
  });

  it("detail fallback (invoice 404) keeps the ACVEL PDF and hides the Digital Grid one", async () => {
    const snapshot = snapshotSchema.parse({
      ucs: [],
      invoices: [
        { id: "f1", competencia: "2026-07", status: "PAGA", valor_total: 300, origem: "ACVEL", pdf_url: "/v1/faturas/f1/pdf" },
        { id: "d2", competencia: "2026-08", status: "SEM_COBRANCA_ACVEL", valor_total: 0, origem: "DIGITAL_GRID", pdf_url: "/v1/faturas-distribuidora/d2/download" }
      ]
    });
    get.mockImplementation((_service: string, path: string) =>
      path.endsWith("rateio-snapshot") ? Promise.resolve(snapshot) : Promise.reject(new AppError("RESOURCE_NOT_FOUND", "x", { status: 404 }))
    );
    expect((await remoteInvoiceService.getInvoice("f1")).pdfAvailable).toBe(true);
    expect((await remoteInvoiceService.getInvoice("d2")).pdfAvailable).toBe(false);
  });
});

describe("M2 — invoice without charge", () => {
  it("treats a 404 charge lookup as 'no charge' instead of an error", async () => {
    const snapshot = snapshotSchema.parse({ invoices: [{ id: "f1", competencia: "2026-07", status: "PAGA", valor_total: 300, origem: "ACVEL" }] });
    get.mockImplementation((_service: string, path: string) =>
      path.endsWith("rateio-snapshot") ? Promise.resolve(snapshot) : Promise.reject(new AppError("RESOURCE_NOT_FOUND", "x", { status: 404 }))
    );
    // No charge never becomes a confirmed charge; the paid invoice is gated by its own status.
    await expect(remoteInvoiceService.getExistingPix("f1")).resolves.toMatchObject({ invoiceId: "f1", emvCode: "", status: "PROCESSANDO", invoiceStatus: "PAGO" });
    await expect(remoteInvoiceService.getExistingBoleto("f1")).resolves.toMatchObject({ invoiceId: "f1", digitableLine: "", status: "PROCESSANDO", invoiceStatus: "PAGO" });
    await expect(remoteInvoiceService.getPaymentStatus("f1")).resolves.toBe("PROCESSANDO");
  });

  it("still reports other charge errors", async () => {
    get.mockRejectedValue(new AppError("SERVICE_UNAVAILABLE", "x", { status: 503 }));
    await expect(remoteInvoiceService.getPaymentStatus("f1")).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});

describe("deep link to the payment screen of a paid invoice (backend: invoice PAGA, charge PENDENTE)", () => {
  const snapshot = snapshotSchema.parse({ invoices: [{ id: "f1", competencia: "2026-07", status: "PAGA", valor_total: 300, origem: "ACVEL" }] });
  const pendingCharge = { id: "c1", fatura_id: "f1", metodo: "BOLETO", status: "PENDENTE", valor: 300, created_at: "2026-07-01T00:00:00Z" };

  beforeEach(() => {
    get.mockImplementation((_service: string, path: string) => {
      if (path.endsWith("rateio-snapshot")) return Promise.resolve(snapshot);
      if (path === "/v1/pagamentos/cobrancas") return Promise.resolve([pendingCharge]);
      return Promise.reject(new AppError("RESOURCE_NOT_FOUND", "x", { status: 404 }));
    });
  });

  it("keeps the backend charge status (PENDENTE is not turned into CONFIRMADO)", async () => {
    const boleto = await remoteInvoiceService.getExistingBoleto("f1");
    const pix = await remoteInvoiceService.getExistingPix("f1");
    expect(boleto.status).not.toBe("CONFIRMADO");
    expect(pix.status).not.toBe("CONFIRMADO");
    expect(boleto.invoiceStatus).toBe("PAGO");
    expect(pix.invoiceStatus).toBe("PAGO");
  });

  it("shows the neutral 'Fatura já paga' state instead of 'Pix/Boleto ainda não disponível' and offers no payment", async () => {
    const boleto = await remoteInvoiceService.getExistingBoleto("f1");
    const pix = await remoteInvoiceService.getExistingPix("f1");
    expect(paymentScreenGate(boleto.invoiceStatus)).toBe("ALREADY_PAID");
    expect(paymentScreenGate(pix.invoiceStatus, "PROCESSANDO")).toBe("ALREADY_PAID");
  });

  it("keeps the payment flow for open invoices and for a Pix confirmed during the session", () => {
    expect(paymentScreenGate("PENDENTE")).toBe("PAYMENT_FLOW");
    expect(paymentScreenGate("ATRASADO")).toBe("PAYMENT_FLOW");
    expect(paymentScreenGate("PAGO", "CONFIRMADO")).toBe("PAYMENT_FLOW");
  });
});

describe("support tickets — live homologation shapes", () => {
  const ticket = { id: "t1", createdAt: "2026-10-02T14:00:00.000Z", updatedAt: "2026-10-02T14:00:00.000Z", category: "CADASTRO_DOCUMENTOS", status: "AGUARDANDO", subject: "[HML] Teste app mobile", clientId: "c1", lastMessagePreview: "Olá" };
  const message = { id: "m1", ticketId: "t1", sentAt: "2026-10-02T14:00:01.000Z", sender: "USER", text: "Olá", attachments: [] };

  beforeEach(() => {
    get.mockImplementation((_service: string, path: string, schema: { parse: (value: unknown) => unknown }) => {
      if (path === "/v1/support/tickets") return Promise.resolve(schema.parse({ items: [ticket], total: 1, page: 1, pageSize: 20 }));
      if (path.endsWith("/messages")) return Promise.resolve(schema.parse([message]));
      return Promise.resolve(schema.parse(ticket));
    });
  });

  it("reads the { items, total, page, pageSize } list and the camelCase preview", async () => {
    const [first] = await remoteSupportService.list();
    expect(first).toMatchObject({ id: "t1", subject: "[HML] Teste app mobile", category: "CADASTRO", lastMessagePreview: "Olá" });
  });

  it("renders messages with their real send time (sentAt) and the client as sender", async () => {
    const detail = await remoteSupportService.get("t1");
    expect(detail.messages).toEqual([expect.objectContaining({ sender: "CLIENTE", body: "Olá", createdAt: "2026-10-02T14:00:01.000Z" })]);
  });
});

describe("document open flow — signed URL variants", () => {
  const download = downloadAuthenticatedFile as jest.Mock;

  it("returns a public https signed URL as is", async () => {
    get.mockImplementation((_s: string, _p: string, schema: { parse: (v: unknown) => unknown }) => Promise.resolve(schema.parse({ signed_url: "https://storage.example/doc.pdf?sig=1" })));
    await expect(openableDocumentUrl("d1")).resolves.toBe("https://storage.example/doc.pdf?sig=1");
    expect(download).not.toHaveBeenCalled();
  });

  it("downloads an API-relative signed path with the session (homologation) and returns the local file", async () => {
    download.mockResolvedValue("file:///cache/downloads/hml-teste-app-mobile.pdf");
    get.mockImplementation((_s: string, path: string, schema: { parse: (v: unknown) => unknown }) =>
      Promise.resolve(path.endsWith("/signed-url") ? schema.parse({ document_id: "d1", signed_url: "/v1/documentos/d1/content?expires=1", expires_at: "2026-10-02T15:00:00Z" }) : schema.parse({ id: "d1", tipo: "OUTRO", arquivo_nome: "hml-teste-app-mobile.pdf", status_validacao: "PENDENTE" }))
    );
    await expect(openableDocumentUrl("d1")).resolves.toBe("file:///cache/downloads/hml-teste-app-mobile.pdf");
    expect(download).toHaveBeenCalledWith("business", "/v1/documentos/d1/content?expires=1", "hml-teste-app-mobile.pdf");
  });
});

describe("W4 — Sisprime hybrid charge (homologation field set)", () => {
  type Parser = { parse: (value: unknown) => unknown };
  // Field set returned live by GET /v1/pagamentos/cobrancas?fatura_id (Sisprime record; Pix + boleto in one charge).
  const base = { id: "f9", fatura_id: "f9", metodo: "BOLETO", valor: 135.89, gateway: "SISPRIME", gateway_payment_id: null, pix_qr_code_base64: null, pix_txid: null, pix_expira_em: null, boleto_url_pdf: null, boleto_expira_em: "2026-10-16T00:00:00.000Z", confirmado_em: null, created_at: "2026-10-02T15:06:13.498Z" };
  const failed = { ...base, status: "FALHOU", pix_qr_code: null, boleto_codigo: null, boleto_linha_digitavel: null, erro: "Entrada Rejeitada: O campo [Nosso Número] não pode se repetir." };
  const registered = { ...base, status: "PENDENTE", erro: null, pix_qr_code: "00020101021226850014br.gov.bcb.pix2563qrpix-h.example/v2/cobv/abc5204000053039865406135.895802BR6304ABCD", boleto_linha_digitavel: "75691234560000000012345678901234597440000013589", boleto_codigo: "75699744000001358912345600000000012345678901" };
  const invoice = { id: "f9", competencia: "2025-06", valor_total: 135.89, vencimento: "2026-10-16T00:00:00.000Z", status: "PENDENTE", origem_portal: "ACVEL", pdf_status: "PREVIEW" };

  const serve = (charge: object) =>
    get.mockImplementation((_s: string, path: string, schema: Parser) => {
      if (path === "/v1/pagamentos/cobrancas") return Promise.resolve(schema.parse({ data: [charge], meta: { total: 1, page: 1, perPage: 50, totalPages: 1 } }));
      if (path.endsWith("rateio-snapshot")) return Promise.resolve(schema.parse({ invoices: [] }));
      return Promise.resolve(schema.parse(invoice));
    });

  it("failed registration → 'Pix/Boleto ainda não disponível' (backend status kept), polling stops, payment flow kept (invoice open)", async () => {
    serve(failed);
    const pix = await remoteInvoiceService.getExistingPix("f9");
    const boleto = await remoteInvoiceService.getExistingBoleto("f9");
    expect(pix).toMatchObject({ status: "FALHOU", emvCode: "", invoiceStatus: "PENDENTE" });
    expect(boleto).toMatchObject({ status: "FALHOU", digitableLine: "", invoiceStatus: "PENDENTE", dueDate: "2026-10-16" });
    await expect(remoteInvoiceService.getPaymentStatus("f9")).resolves.toBe("FALHOU");
    expect(paymentScreenGate(pix.invoiceStatus, pix.status)).toBe("PAYMENT_FLOW");
  });

  it("registered hybrid boleto → Pix EMV payload and boleto line + barcode from the same charge", async () => {
    serve(registered);
    const pix = await remoteInvoiceService.getExistingPix("f9");
    const boleto = await remoteInvoiceService.getExistingBoleto("f9");
    expect(pix).toMatchObject({ status: "AGUARDANDO", emvCode: registered.pix_qr_code, amount: 135.89, expiresAt: null });
    expect(boleto).toMatchObject({ status: "AGUARDANDO", digitableLine: registered.boleto_linha_digitavel, barcode: registered.boleto_codigo, pdfUrl: null });
    await expect(remoteInvoiceService.getPaymentStatus("f9")).resolves.toBe("AGUARDANDO");
  });

  it("expired and confirmed charges keep the backend status (no invented confirmation)", async () => {
    serve({ ...registered, status: "EXPIRADO" });
    await expect(remoteInvoiceService.getPaymentStatus("f9")).resolves.toBe("EXPIRADO");
    serve({ ...registered, status: "CONFIRMADO", confirmado_em: "2026-10-03T10:00:00.000Z" });
    await expect(remoteInvoiceService.getPaymentStatus("f9")).resolves.toBe("CONFIRMADO");
  });

  it("lists an open invoice even when its competência is outside the selected period", async () => {
    get.mockImplementation((_s: string, path: string, schema: Parser) =>
      Promise.resolve(
        schema.parse(
          path === "/v1/faturas/me"
            ? { data: [invoice, { ...invoice, id: "old-paid", status: "PAGA" }], meta: { total: 2, page: 1, perPage: 100, totalPages: 1 } }
            : { invoices: [] }
        )
      )
    );
    const listed = await remoteInvoiceService.getInvoices({ status: "ALL", periodMonths: 12 });
    expect(listed.map((item) => item.id)).toEqual(["f9"]);
  });
});
