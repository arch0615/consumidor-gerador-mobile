import { randomUUID } from "expo-crypto";
import { z } from "zod";
import type { BenefitsOverview, PointsEntry, Redemption, RedemptionStatus, ReferralStatus, ReferredPerson, Reward, RewardDetail } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import { api } from "../api/apiClient";
import { zId, zIgnoredBody, zList, zNumber, zNumberOrNull, zStringOrNull } from "../api/schema";
import { portalLinks } from "@/navigation/portal-links";
import type { BenefitsService } from "../benefits.service";

const DEFAULT_MONTHLY_LIMIT = 20;
const DEFAULT_REFERRAL_REWARD = 1000;
const STATEMENT_PAGE_SIZE = 50;
const SUPPORTED_PRODUCT_TYPES = new Set(["PRODUTO_FISICO", "PRODUTO_DIGITAL"]);

const walletSchema = z
  .object({
    carteira: z.object({ total: zNumberOrNull, reservado: zNumberOrNull, disponivel: zNumberOrNull }).nullish(),
    available_points: zNumberOrNull,
    reserved_points: zNumberOrNull
  })
  .transform((wallet) => ({
    available: wallet.carteira?.disponivel ?? wallet.available_points ?? 0,
    reserved: wallet.carteira?.reservado ?? wallet.reserved_points ?? 0
  }));

const ledgerEntrySchema = z
  .object({ id: zId, tipo: zStringOrNull, origem: zStringOrNull, descricao: zStringOrNull, pontos: zNumber.default(0), timestamp: zStringOrNull, status: zStringOrNull })
  .transform(
    (entry): PointsEntry => ({
      id: entry.id,
      description: entry.descricao ?? entry.origem ?? "Movimentação de pontos",
      points: entry.pontos,
      occurredAt: entry.timestamp ?? new Date(0).toISOString(),
      status: (entry.status ?? "").toUpperCase() === "PENDENTE" ? "PENDENTE" : "CONFIRMADO"
    })
  );

// GET /v1/pontos/me → { summary: { currentBalance, referralPointsEarned }, data: [...], meta: { page, perPage, totalPages } }
const statementSchema = z.object({
  summary: z.object({ currentBalance: zNumberOrNull }).nullish(),
  data: z.array(ledgerEntrySchema).default([]),
  meta: z.object({ page: zNumberOrNull, totalPages: zNumberOrNull, total_pages: zNumberOrNull }).nullish()
});

const referralSchema = z.object({
  codigo: zStringOrNull,
  link: zStringOrNull,
  totalIndicados: zNumberOrNull,
  indicadosAtivos: zNumberOrNull,
  pontosGanhos: zNumberOrNull,
  indicadosNoMes: zNumberOrNull,
  limiteMensal: zNumberOrNull,
  recompensaPorIndicacao: zNumberOrNull,
  programaAtivo: z.boolean().nullish(),
  mensagemConvite: zStringOrNull
});

function referralStatusOf(raw: string | null): ReferralStatus {
  switch ((raw ?? "").toUpperCase()) {
    case "ATIVO":
      return "ATIVO";
    case "CANCELADO":
      return "CANCELADO";
    case "EM_ANALISE":
      return "EM_ANALISE";
    default:
      return "CADASTRADO";
  }
}

// GET /v1/consumidores/me/indicados — names are masked by the API (field names as mapped by the portal).
const referredSchema = z
  .object({ id: zId, nome: zStringOrNull, name: zStringOrNull, status: zStringOrNull, createdAt: zStringOrNull, created_at: zStringOrNull, rewardPoints: zNumberOrNull })
  .transform(
    (person): ReferredPerson => ({
      id: person.id,
      name: person.nome ?? person.name ?? "Indicado",
      createdAt: person.createdAt ?? person.created_at ?? new Date(0).toISOString(),
      status: referralStatusOf(person.status),
      rewardPoints: person.rewardPoints ?? 0
    })
  );

const productSchema = z.object({
  id: zId,
  nome: zStringOrNull,
  descricao: zStringOrNull,
  descricao_detalhada: zStringOrNull,
  preco_pontos: zNumber.default(0),
  categoria: zStringOrNull,
  tipo_produto: zStringOrNull,
  ativo: z.boolean().default(true),
  estoque_disponivel: zNumberOrNull
});

type Product = z.output<typeof productSchema>;

function isConsumerReward(product: Product): boolean {
  return SUPPORTED_PRODUCT_TYPES.has((product.tipo_produto ?? "").toUpperCase()) && product.preco_pontos > 0;
}

function toReward(product: Product): Reward {
  return {
    id: product.id,
    name: product.nome ?? "Recompensa",
    description: product.descricao ?? "",
    pointsPrice: product.preco_pontos,
    category: product.categoria ?? "Recompensas",
    available: product.ativo && (product.estoque_disponivel ?? 0) > 0
  };
}

/** Portal "Meus resgates" status vocabulary. */
export function redemptionStatusOf(raw: string | null): RedemptionStatus {
  switch ((raw ?? "").toUpperCase()) {
    case "PENDENTE":
      return "PENDENTE";
    case "ENVIADO":
      return "ENVIADO";
    case "ENTREGUE":
      return "ENTREGUE";
    case "REPROVADO":
      return "REPROVADO";
    case "CANCELADO":
    case "ESTORNADO":
      return "CANCELADO";
    default:
      return "PROCESSANDO";
  }
}

// GET /v1/pedidos (scoped to the consumer) — fields as mapped by the portal's marketplace service.
const redemptionSchema = z
  .object({
    id: zId,
    produto_id: zStringOrNull,
    produto: z.object({ nome: zStringOrNull }).nullish(),
    pontos_gastos: zNumberOrNull,
    pontos_solicitados: zNumberOrNull,
    status: zStringOrNull,
    created_at: zStringOrNull,
    createdAt: zStringOrNull,
    version: zNumberOrNull
  })
  .transform(
    (order): Redemption => ({
      id: order.id,
      rewardId: order.produto_id ?? "",
      rewardName: order.produto?.nome ?? "Recompensa",
      points: order.pontos_gastos || order.pontos_solicitados || 0,
      status: redemptionStatusOf(order.status),
      createdAt: order.created_at ?? order.createdAt ?? new Date(0).toISOString(),
      version: order.version
    })
  );

/** <consumer portal>/indicacao/<codigo> from the environment; the API's link only when no portal origin is configured. */
function referralLink(apiLink: string | null, code: string): string {
  return portalLinks().referral(code) ?? apiLink ?? code;
}

function fetchWallet() {
  return api.get("business", "/v1/pedidos/me/context", walletSchema);
}

async function loadOverview(): Promise<BenefitsOverview> {
  const [wallet, ledger, referral, products] = await Promise.all([
    fetchWallet(),
    api.get("business", "/v1/pontos/me", zList(ledgerEntrySchema), { query: { page: 1, perPage: 100 } }),
    api.get("business", "/v1/consumidores/me/indicacao", referralSchema),
    api.get("business", "/v1/produtos", zList(productSchema), { query: { page: 1, per_page: 50, ativo: "true", tipo_publico: "CONSUMIDOR" } })
  ]);
  const code = referral.codigo ?? "";
  return {
    pointsBalance: wallet.available,
    // Points reserved by redemptions awaiting approval.
    pointsPending: wallet.reserved,
    recentEntries: ledger.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 20),
    rewards: products
      .filter(isConsumerReward)
      .map(toReward)
      .sort((a, b) => a.pointsPrice - b.pointsPrice),
    referral: {
      code,
      link: referralLink(referral.link, code),
      invited: referral.totalIndicados ?? 0,
      active: referral.indicadosAtivos ?? 0,
      pointsEarned: referral.pontosGanhos ?? 0,
      monthlyLimit: referral.limiteMensal ?? DEFAULT_MONTHLY_LIMIT,
      usedThisMonth: referral.indicadosNoMes ?? 0
    }
  };
}

async function loadRedemptions(): Promise<Redemption[]> {
  const orders = await api.get("business", "/v1/pedidos", zList(redemptionSchema), { query: { page: 1, per_page: 100 } });
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const remoteBenefitsService: BenefitsService = {
  getOverview: loadOverview,

  async redeem(rewardId) {
    // The redemption reserves points + stock; it is debited after administrative approval.
    await api.post("business", "/v1/pedidos", zIgnoredBody, { body: { produto_id: rewardId, quantidade: 1 }, idempotencyKey: randomUUID() });
    return loadOverview();
  },

  async getReward(rewardId) {
    const [product, wallet] = await Promise.all([api.get("business", `/v1/produtos/${encodeURIComponent(rewardId)}`, productSchema), fetchWallet()]);
    // Same rule as the portal: only physical/digital consumer products are redeemable here.
    if (!isConsumerReward(product)) throw new AppError("RESOURCE_NOT_FOUND", "Recompensa indisponível.");
    const reward: RewardDetail = { ...toReward(product), longDescription: product.descricao_detalhada ?? product.descricao ?? "" };
    return { reward, pointsBalance: wallet.available };
  },

  getRedemptions: loadRedemptions,

  async cancelRedemption(redemption) {
    await api.post("business", `/v1/pedidos/${encodeURIComponent(redemption.id)}/cancel`, zIgnoredBody, {
      body: { motivo: "Cancelado pelo consumidor", expected_version: redemption.version ?? 1 },
      idempotencyKey: randomUUID()
    });
    return loadRedemptions();
  },

  async getPointsStatement(page) {
    const result = await api.get("business", "/v1/pontos/me", statementSchema, { query: { page, perPage: STATEMENT_PAGE_SIZE } });
    return {
      entries: [...result.data].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
      page: result.meta?.page ?? page,
      // An empty statement reports totalPages 0.
      totalPages: Math.max(result.meta?.totalPages ?? result.meta?.total_pages ?? page, 1),
      balance: result.summary?.currentBalance ?? 0
    };
  },

  async getReferralProgram() {
    const [referral, referred] = await Promise.all([
      api.get("business", "/v1/consumidores/me/indicacao", referralSchema),
      api.get("business", "/v1/consumidores/me/indicados", zList(referredSchema))
    ]);
    const code = referral.codigo ?? "";
    return {
      active: referral.programaAtivo ?? true,
      code,
      link: referralLink(referral.link, code),
      inviteMessage: referral.mensagemConvite ?? "",
      rewardPoints: referral.recompensaPorIndicacao ?? DEFAULT_REFERRAL_REWARD,
      monthlyLimit: referral.limiteMensal ?? DEFAULT_MONTHLY_LIMIT,
      usedThisMonth: referral.indicadosNoMes ?? 0,
      invited: referral.totalIndicados ?? referred.length,
      activeReferrals: referral.indicadosAtivos ?? 0,
      pointsEarned: referral.pontosGanhos ?? 0,
      referred: [...referred].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    };
  }
};
