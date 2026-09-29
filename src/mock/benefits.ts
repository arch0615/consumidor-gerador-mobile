import type { BenefitsOverview } from "@/types/domain";
import { daysAgo } from "./calendar";
import { demoProfile } from "./consumer";

export const benefits: BenefitsOverview = {
  pointsBalance: 1850,
  pointsPending: 250,
  recentEntries: [
    { id: "pts_001", description: "Indicação aprovada — Carlos M.", points: 250, occurredAt: daysAgo(12), status: "CONFIRMADO" },
    { id: "pts_002", description: "Pagamento em dia", points: 50, occurredAt: daysAgo(18), status: "CONFIRMADO" },
    { id: "pts_003", description: "Indicação em análise — Juliana R.", points: 250, occurredAt: daysAgo(3), status: "PENDENTE" },
    { id: "pts_004", description: "Troca: cupom iFood R$ 20", points: -400, occurredAt: daysAgo(35), status: "CONFIRMADO" },
    { id: "pts_005", description: "Pagamento em dia", points: 50, occurredAt: daysAgo(48), status: "CONFIRMADO" }
  ],
  rewards: [
    { id: "rwd_001", name: "Desconto de R$ 25 na fatura", description: "Aplicado na próxima fatura ACVEL.", pointsPrice: 1000, category: "Fatura", available: true },
    { id: "rwd_002", name: "Cupom iFood R$ 20", description: "Código enviado por e-mail em até 24h.", pointsPrice: 400, category: "Parceiros", available: true },
    { id: "rwd_003", name: "Muda de árvore nativa", description: "Plantada em seu nome em área de reflorestamento.", pointsPrice: 300, category: "Sustentabilidade", available: true },
    { id: "rwd_004", name: "Desconto de R$ 60 na fatura", description: "Aplicado na próxima fatura ACVEL.", pointsPrice: 2400, category: "Fatura", available: false }
  ],
  referral: {
    code: demoProfile.referralCode,
    link: `https://acvel.com.br/indique/${demoProfile.referralCode}`,
    invited: 4,
    active: 2,
    pointsEarned: 500,
    monthlyLimit: 5,
    usedThisMonth: 1
  }
};
