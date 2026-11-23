import { AppError } from "@/utils/app-error";
import { api } from "../../api/apiClient";
import { redemptionStatusOf, remoteBenefitsService } from "../benefits.remote";
import { generatorRequestStatusOf, remoteGeneratorService } from "../generator.remote";

// Consumer-portal parity features (docs/live-api-validation.md §15). Shapes follow the homologation API
// (live GET shapes) and, for list items not observable on the test account, the portal's own mappers.

jest.mock("@/config/env", () => ({ config: { apiTimeoutMs: 1000, consumidorAppUrl: "https://cliente.example", termsUrl: "", privacyUrl: "" }, apiBaseUrl: () => "https://api.test" }));
jest.mock("../../api/apiClient", () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid-1" }));

type Parser = { parse: (value: unknown) => unknown };
const get = api.get as jest.Mock;
const post = api.post as jest.Mock;

function serve(routes: Record<string, unknown>) {
  get.mockImplementation((_service: string, path: string, schema: Parser) => {
    const body = routes[path];
    if (body === undefined) return Promise.reject(new AppError("RESOURCE_NOT_FOUND", "x", { status: 404 }));
    return Promise.resolve(schema.parse(body));
  });
}

beforeEach(() => {
  get.mockReset();
  post.mockReset().mockResolvedValue(undefined);
});

describe("Quero ser gerador (generator access request)", () => {
  const me = { userId: "u1", email: "c@example.com", tipoUsuario: "CONSUMIDOR", is_generator: false };

  it("maps request statuses by meaning", () => {
    expect(generatorRequestStatusOf("PENDING")).toBe("ABERTA");
    expect(generatorRequestStatusOf("CONTACTED")).toBe("EM_CONTATO");
    expect(generatorRequestStatusOf("GENERATOR_ACCESS_GRANTED")).toBe("APROVADA");
    expect(generatorRequestStatusOf("CLOSED")).toBe("ENCERRADA");
    expect(generatorRequestStatusOf(null)).toBe("ABERTA");
  });

  it("reads the generator flag and the open request", async () => {
    serve({
      "/v1/auth/me": me,
      "/v1/consumidores/me": { id: "c1", status: "APROVADO", is_generator: false },
      "/v1/gerador-interest-requests/me": [
        { id: "r1", status: "CLOSED", created_at: "2026-01-01T00:00:00Z" },
        { id: "r2", status: "PENDING", created_at: "2026-09-01T00:00:00Z", message: "Tenho 10 kWp" }
      ]
    });
    const access = await remoteGeneratorService.getAccess();
    expect(access.isGenerator).toBe(false);
    expect(access.requests.map((request) => request.id)).toEqual(["r2", "r1"]);
    expect(access.openRequest).toMatchObject({ id: "r2", status: "ABERTA", message: "Tenho 10 kWp" });
  });

  it("treats an existing generator profile as active (no new request needed)", async () => {
    serve({ "/v1/auth/me": { ...me, is_generator: true }, "/v1/consumidores/me": { id: "c1" }, "/v1/gerador-interest-requests/me": { data: [] } });
    await expect(remoteGeneratorService.getAccess()).resolves.toMatchObject({ isGenerator: true, openRequest: null });
  });

  it("posts the request with source PROFILE and a trimmed message (default text when empty)", async () => {
    serve({ "/v1/auth/me": me, "/v1/consumidores/me": { id: "c1" }, "/v1/gerador-interest-requests/me": [] });
    await remoteGeneratorService.requestAccess("  Tenho placas no telhado  ");
    expect(post).toHaveBeenLastCalledWith("business", "/v1/gerador-interest-requests", expect.anything(), { body: { source: "PROFILE", message: "Tenho placas no telhado" } });
    await remoteGeneratorService.requestAccess("");
    expect(post.mock.calls.at(-1)?.[3]).toMatchObject({ body: { source: "PROFILE", message: expect.stringContaining("gerador") } });
  });
});

describe("marketplace: reward detail, Meus resgates, cancel", () => {
  const wallet = { carteira: { total: "1200", reservado: "200", disponivel: "1000" } };

  it("maps redemption statuses like the portal", () => {
    expect(redemptionStatusOf("CONFIRMADO")).toBe("PROCESSANDO");
    expect(redemptionStatusOf("EM_SEPARACAO")).toBe("PROCESSANDO");
    expect(redemptionStatusOf("ESTORNADO")).toBe("CANCELADO");
    expect(redemptionStatusOf("PENDENTE")).toBe("PENDENTE");
  });

  it("returns the reward detail with the available balance; non-consumer products are not redeemable", async () => {
    serve({
      "/v1/produtos/p1": { id: "p1", nome: "Cupom", descricao: "Curta", descricao_detalhada: "Longa", preco_pontos: 400, tipo_produto: "PRODUTO_DIGITAL", ativo: true, estoque_disponivel: 3 },
      "/v1/produtos/p2": { id: "p2", nome: "Serviço", preco_pontos: 400, tipo_produto: "SERVICO", ativo: true, estoque_disponivel: 3 },
      "/v1/pedidos/me/context": wallet
    });
    await expect(remoteBenefitsService.getReward("p1")).resolves.toMatchObject({ reward: { id: "p1", longDescription: "Longa", available: true }, pointsBalance: 1000 });
    await expect(remoteBenefitsService.getReward("p2")).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
  });

  it("lists my redemptions newest first and cancels with the optimistic-lock version", async () => {
    serve({
      "/v1/pedidos": {
        data: [
          { id: "o1", produto_id: "p1", produto: { nome: "Cupom" }, pontos_solicitados: 400, status: "PENDENTE", created_at: "2026-09-01T00:00:00Z", version: 2 },
          { id: "o2", produto_id: "p3", produto: { nome: "Muda" }, pontos_gastos: 300, status: "ENTREGUE", created_at: "2026-10-01T00:00:00Z", version: 4 }
        ],
        meta: { total: 2, page: 1, per_page: 100, total_pages: 1 }
      }
    });
    const list = await remoteBenefitsService.getRedemptions();
    expect(list.map((item) => [item.id, item.status, item.points])).toEqual([
      ["o2", "ENTREGUE", 300],
      ["o1", "PENDENTE", 400]
    ]);
    await remoteBenefitsService.cancelRedemption({ id: "o1", version: 2 });
    expect(post).toHaveBeenLastCalledWith("business", "/v1/pedidos/o1/cancel", expect.anything(), { body: { motivo: "Cancelado pelo consumidor", expected_version: 2 }, idempotencyKey: "uuid-1" });
  });

  it("redeems with an Idempotency-Key", async () => {
    serve({ "/v1/pedidos/me/context": wallet, "/v1/pontos/me": { data: [] }, "/v1/consumidores/me/indicacao": { codigo: "ABC" }, "/v1/produtos": { data: [] } });
    await remoteBenefitsService.redeem("p1");
    expect(post).toHaveBeenLastCalledWith("business", "/v1/pedidos", expect.anything(), { body: { produto_id: "p1", quantidade: 1 }, idempotencyKey: "uuid-1" });
  });
});

describe("points statement and referral program", () => {
  it("pages the statement with the API meta and balance (live shape)", async () => {
    serve({
      "/v1/pontos/me": {
        summary: { currentBalance: 1850, referralPointsEarned: 500 },
        data: [
          { id: "e1", descricao: "Indicação", pontos: 250, timestamp: "2026-08-01T00:00:00Z" },
          { id: "e2", descricao: "Troca", pontos: -400, timestamp: "2026-09-01T00:00:00Z" }
        ],
        meta: { total: 60, page: 1, perPage: 50, totalPages: 2 }
      }
    });
    const page = await remoteBenefitsService.getPointsStatement(1);
    expect(page).toMatchObject({ page: 1, totalPages: 2, balance: 1850 });
    expect(page.entries.map((entry) => entry.id)).toEqual(["e2", "e1"]);
  });

  it("maps the referral program (live /indicacao shape) and the masked referred list", async () => {
    serve({
      "/v1/consumidores/me/indicacao": { codigo: "ABC123", link: "https://cliente.example/indicacao/ABC123", totalIndicados: 2, indicadosAtivos: 1, totalCliques: 9, limiteMensal: 20, indicadosNoMes: 1, pontosGanhos: 1000, recompensaPorIndicacao: 1000, programaAtivo: false, mensagemConvite: "Use meu link" },
      "/v1/consumidores/me/indicados": [
        { id: "i1", nome: "Carlos M***", status: "ATIVO", createdAt: "2026-08-01T00:00:00Z", rewardPoints: 1000 },
        { id: "i2", nome: "Ana L***", status: "OUTRO", createdAt: "2026-09-01T00:00:00Z" }
      ]
    });
    const program = await remoteBenefitsService.getReferralProgram();
    expect(program).toMatchObject({ active: false, code: "ABC123", link: "https://cliente.example/indicacao/ABC123", rewardPoints: 1000, monthlyLimit: 20, usedThisMonth: 1, invited: 2, activeReferrals: 1, inviteMessage: "Use meu link" });
    expect(program.referred.map((person) => [person.name, person.status])).toEqual([
      ["Ana L***", "CADASTRADO"],
      ["Carlos M***", "ATIVO"]
    ]);
  });
});
