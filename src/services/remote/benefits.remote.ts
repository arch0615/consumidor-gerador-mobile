import { randomUUID } from "expo-crypto";
import { z } from "zod";
import { config } from "@/config/env";
import type { BenefitsOverview, PointsEntry, Reward } from "@/types/domain";
import { api } from "../api/apiClient";
import { zId, zIgnoredBody, zList, zNumber, zNumberOrNull, zStringOrNull } from "../api/schema";
import type { BenefitsService } from "../benefits.service";

const DEFAULT_MONTHLY_LIMIT = 20;
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

const referralSchema = z.object({
  codigo: zStringOrNull,
  totalIndicados: zNumberOrNull,
  indicadosAtivos: zNumberOrNull,
  pontosGanhos: zNumberOrNull,
  indicadosNoMes: zNumberOrNull,
  limiteMensal: zNumberOrNull
});

const productSchema = z.object({
  id: zId,
  nome: zStringOrNull,
  descricao: zStringOrNull,
  preco_pontos: zNumber.default(0),
  categoria: zStringOrNull,
  tipo_produto: zStringOrNull,
  ativo: z.boolean().default(true),
  estoque_disponivel: zNumberOrNull
});

type Product = z.output<typeof productSchema>;

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

function referralLink(code: string): string {
  return config.portalUrl && code ? `${config.portalUrl}/indicacao/${encodeURIComponent(code)}` : code;
}

async function loadOverview(): Promise<BenefitsOverview> {
  const [wallet, ledger, referral, products] = await Promise.all([
    api.get("business", "/v1/pedidos/me/context", walletSchema),
    api.get("business", "/v1/pontos/me", zList(ledgerEntrySchema), { query: { perPage: 100 } }),
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
      .filter((product) => SUPPORTED_PRODUCT_TYPES.has((product.tipo_produto ?? "").toUpperCase()) && product.preco_pontos > 0)
      .map(toReward)
      .sort((a, b) => a.pointsPrice - b.pointsPrice),
    referral: {
      code,
      link: referralLink(code),
      invited: referral.totalIndicados ?? 0,
      active: referral.indicadosAtivos ?? 0,
      pointsEarned: referral.pontosGanhos ?? 0,
      monthlyLimit: referral.limiteMensal ?? DEFAULT_MONTHLY_LIMIT,
      usedThisMonth: referral.indicadosNoMes ?? 0
    }
  };
}

export const remoteBenefitsService: BenefitsService = {
  getOverview: loadOverview,

  async redeem(rewardId) {
    // The redemption reserves points + stock; it is debited after administrative approval.
    await api.post("business", "/v1/pedidos", zIgnoredBody, { body: { produto_id: rewardId, quantidade: 1 }, idempotencyKey: randomUUID() });
    return loadOverview();
  }
};
