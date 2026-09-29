import { Gift, Share2, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Share, View } from "react-native";
import { ACVELButton, ACVELCard, ACVELModal, AppText, Columns, CopyField, InfoCard, ListItem, MetricCard, PageHeader, QueryView, Screen, SectionHeader, StatusChip } from "@/components";
import { useBenefits, useRedeemReward } from "@/features/benefits/hooks/useBenefits";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useTheme } from "@/theme";
import type { Reward } from "@/types/domain";
import { errorMessage } from "@/utils/app-error";
import { formatDate, formatPoints, formatSignedPoints } from "@/utils/format";

export default function BenefitsScreen() {
  const theme = useTheme();
  const benefits = useBenefits();
  const redeem = useRedeemReward();
  const refresh = useRefreshControl(benefits);
  const [pendingReward, setPendingReward] = useState<Reward | null>(null);

  return (
    <Screen edges={["top"]} {...refresh}>
      <PageHeader title="Benefícios" subtitle="Acumule pontos e troque por recompensas" />
      <QueryView query={benefits} loading="dashboard">
        {(overview) => {
          const { referral } = overview;
          const remainingInvites = Math.max(referral.monthlyLimit - referral.usedThisMonth, 0);
          return (
            <View style={{ gap: theme.spacing.lg }}>
              <ACVELCard variant="hero" padding="lg">
                <View style={{ gap: theme.spacing.xs }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
                    <Sparkles size={theme.sizing.iconMd} color={theme.colors.accent} />
                    <AppText variant="subheadStrong" tone="heroMuted">
                      Seus pontos
                    </AppText>
                  </View>
                  <AppText variant="display" tone="hero">
                    {formatPoints(overview.pointsBalance)}
                  </AppText>
                  {overview.pointsPending > 0 ? (
                    <AppText variant="footnote" tone="heroMuted">
                      + {formatPoints(overview.pointsPending)} em análise
                    </AppText>
                  ) : null}
                </View>
              </ACVELCard>

              {redeem.isSuccess ? <InfoCard tone="success" title="Resgate solicitado!" message="Seus pontos ficam reservados até a aprovação do pedido. Avisaremos você por aqui." /> : null}
              {redeem.isError ? <InfoCard tone="danger" title="Não foi possível trocar" message={errorMessage(redeem.error)} /> : null}

              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Indique e ganhe" subtitle="Ganhe pontos quando um amigo começar a economizar" />
                <ACVELCard>
                  <View style={{ gap: theme.spacing.md }}>
                    <CopyField label="Seu link de indicação" value={referral.link} copyLabel="Copiar link" copiedMessage="Link de indicação copiado" numberOfLines={1} />
                    <ACVELButton
                      label="Compartilhar convite"
                      icon={Share2}
                      disabled={remainingInvites === 0}
                      onPress={() => void Share.share({ message: `Economize na conta de luz com energia limpa da ACVEL! Use meu código ${referral.code}: ${referral.link}` })}
                    />
                    <AppText variant="footnote" tone="secondary" align="center">
                      {remainingInvites > 0 ? `Você ainda pode enviar ${remainingInvites} de ${referral.monthlyLimit} convites este mês.` : "Limite mensal de convites atingido."}
                    </AppText>
                  </View>
                </ACVELCard>
                <Columns>
                  <MetricCard label="Amigos indicados" value={String(referral.invited)} caption={`${referral.active} já economizando`} compact />
                  <MetricCard label="Pontos ganhos" value={formatPoints(referral.pointsEarned)} caption="com indicações" compact />
                </Columns>
              </View>

              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Recompensas" />
                <ACVELCard padding="xs">
                  {overview.rewards.map((reward, index) => {
                    const affordable = reward.available && overview.pointsBalance >= reward.pointsPrice;
                    return (
                      <ListItem
                        key={reward.id}
                        icon={Gift}
                        iconTone={affordable ? "brand" : "neutral"}
                        title={reward.name}
                        subtitle={reward.description}
                        caption={`${formatPoints(reward.pointsPrice)} · ${reward.category}`}
                        accessibilityHint={affordable ? "Toque para trocar" : undefined}
                        trailing={!reward.available ? <StatusChip label="Esgotado" tone="neutral" size="sm" /> : !affordable ? <StatusChip label="Pontos insuficientes" tone="neutral" size="sm" /> : undefined}
                        {...(affordable ? { onPress: () => setPendingReward(reward) } : {})}
                        divider={index < overview.rewards.length - 1}
                      />
                    );
                  })}
                </ACVELCard>
              </View>

              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Extrato de pontos" />
                <ACVELCard padding="xs">
                  {overview.recentEntries.map((entry, index) => (
                    <ListItem
                      key={entry.id}
                      title={entry.description}
                      subtitle={`${formatDate(entry.occurredAt.slice(0, 10))}${entry.status === "PENDENTE" ? " · em análise" : ""}`}
                      value={formatSignedPoints(entry.points)}
                      valueTone={entry.points >= 0 ? "success" : "danger"}
                      divider={index < overview.recentEntries.length - 1}
                    />
                  ))}
                </ACVELCard>
              </View>

              <ACVELModal
                visible={pendingReward !== null}
                icon={Gift}
                title={pendingReward ? `Trocar por ${pendingReward.name}?` : ""}
                message={pendingReward ? `Serão descontados ${formatPoints(pendingReward.pointsPrice)} do seu saldo.` : undefined}
                confirmLabel="Confirmar troca"
                confirmLoading={redeem.isPending}
                onCancel={() => setPendingReward(null)}
                onConfirm={() => pendingReward && redeem.mutate(pendingReward.id, { onSettled: () => setPendingReward(null) })}
              />
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}
