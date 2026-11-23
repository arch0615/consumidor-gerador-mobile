/// <reference types="node" />
import fs from "fs";
import path from "path";

/**
 * Scope rule (client): the mobile app provides feature parity with the consumer production portal
 * (cliente.appacvel.com.br). Administrative operations remain only in the ADM module, and the app
 * never generates invoices, Pix, boletos or other financial records. These checks keep that
 * boundary from regressing; user self-service actions of the portal are allowed.
 */
const SRC = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const files = sourceFiles(SRC).map((file) => ({ file: path.relative(SRC, file).replace(/\\/g, "/"), text: fs.readFileSync(file, "utf8") }));

/** Every (api, path) the app calls, with `${…}` segments normalised to `{id}`. */
function calls(pattern: RegExp): string[] {
  return files.flatMap(({ text }) => [...text.matchAll(pattern)].map((match) => `${match[1]} ${(match[2] ?? "").replace(/\$\{[^}]+\}/g, "{id}").replace(/\?.*$/, "")}`));
}

const writeCalls = [
  ...calls(/api\.(?:post|put|patch|delete)\(\s*"(auth|business|rateio)",\s*[`"]([^`"]+)/g),
  ...calls(/uploadMultipart\(\s*"(auth|business|rateio)",\s*[`"]([^`"]+)/g)
];

describe("app scope: portal parity, no financial generation, no admin operations", () => {
  it("calls Rateio for writes only for the bill OCR used by unit registration (portal parity)", () => {
    expect(writeCalls.filter((call) => call.startsWith("rateio ")).sort()).toEqual(["rateio /v1/fatura-ocr/processar"]);
  });

  it("never generates invoices, charges, Pix or boletos", () => {
    const forbidden = /\/v1\/(faturas(\/|$)|pagamentos|cobrancas|sisprime|fechamento|faturas-distribuidora)/;
    expect(writeCalls.filter((call) => forbidden.test(call.split(" ")[1] ?? ""))).toEqual([]);
    const names = files.flatMap(({ file, text }) => [...text.matchAll(/\b(createInvoice|generatePix|generateBoleto|createCharge|registerBoleto|createPix)\b/g)].map((match) => `${file}: ${match[0]}`));
    expect(names).toEqual([]);
  });

  it("uses only the user-facing marketplace writes (own redemption + its cancellation), no admin marketplace operations", () => {
    const marketplaceWrites = writeCalls.filter((call) => /\/v1\/(pedidos|produtos|carteira|pontos|marketplace)/.test(call));
    expect(marketplaceWrites.sort()).toEqual(["business /v1/pedidos", "business /v1/pedidos/{id}/cancel"]);
  });

  it("only requests generator access (granting it is an ADM operation)", () => {
    expect(writeCalls.filter((call) => /gerador|geradores/.test(call))).toEqual(["business /v1/gerador-interest-requests"]);
  });

  it("calls no ADM-only endpoint", () => {
    const admin = /\/v1\/(admin|admin-configuracoes|roles|permissions|users\/\{id\}\/roles|.*\/(aprovar|reprovar|approve|reject|suspender|reativar|status))(\/|$)/;
    expect(writeCalls.filter((call) => admin.test(call.split(" ")[1] ?? ""))).toEqual([]);
  });

  it("keeps the billing service read-only (existing Pix / boleto are only displayed)", () => {
    const service = files.find(({ file }) => file === "services/invoice.service.ts")?.text ?? "";
    const members = [...service.matchAll(/^ {2}(\w+)\(/gm)].map((match) => match[1]);
    expect(members).toEqual(["getInvoices", "getInvoice", "downloadInvoicePdf", "getExistingPix", "getPaymentStatus", "getExistingBoleto", "getPaymentHistory"]);
  });
});
