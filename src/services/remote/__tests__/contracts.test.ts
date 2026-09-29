import { barcodeFromDigitableLine } from "@/utils/boleto";
import { actionFromLink, categoryFromType } from "../../notification-actions";
import { normaliseCompetencia, normaliseInvoiceStatus, snapshotSchema } from "../business";
import { meSchema } from "../me";

jest.mock("@/config/env", () => ({ config: { apiTimeoutMs: 1000 }, apiBaseUrl: () => "https://api.test" }));

describe("GET /v1/auth/me contract (consumidor-gerador-api `Me`)", () => {
  // Shape of meResponseSchema in consumidor-gerador-api/src/modules/auth/auth.schema.ts.
  const me = {
    userId: "2f1c7c4e-8f8a-4a57-9e7f-2b8c1d2e3f40",
    email: "maria@example.com",
    emailVerified: true,
    displayName: "Maria Souza",
    phoneNumber: "+5511987654321",
    photoURL: null,
    tipoUsuario: "CONSUMIDOR",
    status: "ACTIVE",
    roles: [{ slug: "consumidor_basico" }],
    permissions: [{ resource: "faturas", action: "READ", scope: "OWN" }],
    cpf_cnpj: "52998224725",
    consumerId: "8a1c7c4e-8f8a-4a57-9e7f-2b8c1d2e3f41",
    generatorId: null,
    is_generator: false,
    onboarding_status: "APROVADO",
    onboarding_completed: true,
    created_at: "2025-11-04T12:00:00.000Z"
  };

  it("maps the identity, roles and permissions", () => {
    const result = meSchema.parse(me);
    expect(result.identity).toMatchObject({
      userId: me.userId,
      firstName: "Maria",
      status: "ACTIVE",
      userType: "CONSUMIDOR",
      roles: ["consumidor_basico"],
      consumerId: me.consumerId,
      onboardingCompleted: true
    });
    expect(result.identity.permissions[0]).toEqual({ resource: "faturas", action: "READ", scope: "OWN" });
    expect(result.phoneNumber).toBe("+5511987654321");
  });

  it("rejects a payload without userId", () => {
    expect(meSchema.safeParse({ ...me, userId: undefined }).success).toBe(false);
  });
});

describe("rateio snapshot contract", () => {
  it("accepts decimals as strings and fills missing collections", () => {
    const snapshot = snapshotSchema.parse({
      consumidor_id: "c1",
      invoices: [{ id: "f1", uc_id: null, competencia: "2026-08", status: "PENDENTE", vencimento: "2026-09-10", valor_total: "187.40", economia_reais: "32.10", consumo_kwh: 300 }],
      summary: { total_economia_reais: "412.55", por_competencia: [{ competencia: "2026-08", valor_total: "187.4", economia_reais: 32.1 }] }
    });
    expect(snapshot.ucs).toEqual([]);
    expect(snapshot.invoices[0]?.valor_total).toBe(187.4);
    expect(snapshot.summary.total_economia_reais).toBeCloseTo(412.55);
    expect(snapshot.summary.por_competencia[0]?.total_sem_acvel).toBeNull();
  });
});

describe("invoice status normalisation", () => {
  it("maps backend vocabularies", () => {
    expect(normaliseInvoiceStatus("PAGA", "2020-01-10")).toBe("PAGO");
    expect(normaliseInvoiceStatus("VENCIDA", "2099-01-10")).toBe("ATRASADO");
    expect(normaliseInvoiceStatus("CANCELADA", "2020-01-10")).toBe("ARQUIVADO");
    expect(normaliseInvoiceStatus("sem_cobranca_acvel", "2020-01-10")).toBe("SEM_COBRANCA_ACVEL");
  });

  it("derives overdue from the due date for open invoices", () => {
    expect(normaliseInvoiceStatus("EMITIDA", "2020-01-10")).toBe("ATRASADO");
    expect(normaliseInvoiceStatus("PENDENTE", "2099-01-10")).toBe("PENDENTE");
  });

  it("normalises competências", () => {
    expect(normaliseCompetencia("2026-08-01")).toBe("2026-08");
    expect(normaliseCompetencia("08/2026")).toBe("2026-08");
  });
});

describe("boleto digitable line → barcode", () => {
  it("rebuilds the 44-digit barcode", () => {
    const barcode = "00193373700000001000500940144816060680935031";
    // Build the line from the barcode (check digits are not used by the conversion).
    const line = `${barcode.slice(0, 4)}${barcode.slice(19, 24)}0${barcode.slice(24, 34)}0${barcode.slice(34, 44)}0${barcode.slice(4, 5)}${barcode.slice(5, 19)}`;
    expect(line).toHaveLength(47);
    expect(barcodeFromDigitableLine(line)).toBe(barcode);
  });

  it("rejects non-bank lines", () => {
    expect(barcodeFromDigitableLine("836200000011")).toBeNull();
  });
});

describe("notification links", () => {
  it("maps portal links to app actions", () => {
    expect(actionFromLink("/faturas/abc")).toEqual({ type: "INVOICE_DETAILS", resourceId: "abc" });
    expect(actionFromLink("https://cliente.appacvel.com.br/pagamentos/pix?fatura=f9")).toEqual({ type: "INVOICE_PAYMENT", resourceId: "f9" });
    expect(actionFromLink("/suporte/t1")).toEqual({ type: "SUPPORT_TICKET", resourceId: "t1" });
    expect(actionFromLink("/minhas-residencias")).toEqual({ type: "RESIDENCES" });
    expect(actionFromLink("/pontos/extrato")).toEqual({ type: "BENEFITS" });
  });

  it("ignores unknown or non-path links", () => {
    expect(actionFromLink("javascript:alert(1)")).toBeNull();
    expect(actionFromLink("/algo-desconhecido")).toBeNull();
    expect(actionFromLink(null)).toBeNull();
  });

  it("maps notification types to categories", () => {
    expect(categoryFromType("FATURA_GERADA")).toBe("FATURAS");
    expect(categoryFromType("TICKET_ATUALIZADO")).toBe("SUPORTE");
    expect(categoryFromType("MARKETPLACE")).toBe("BENEFICIOS");
    expect(categoryFromType(undefined)).toBe("SISTEMA");
  });
});
