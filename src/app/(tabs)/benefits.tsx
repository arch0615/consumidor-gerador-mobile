import { useRouter } from "expo-router";
import { BookOpen, Gift, ListChecks, ReceiptText, Share2, Sparkles } from "lucide-react-native";
import { Share, View } from "react-native";
import { ACVELButton, ACVELCard, AppText, Columns, CopyField, ListItem, MetricCard, PageHeader, QueryView, Screen, SectionHeader, StatusChip } from "@/components";
import { useBenefits } from "@/features/benefits/hooks/useBenefits";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import { formatDate, formatPoints, formatSignedPoints } from "@/utils/format";

export default function BenefitsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const benefits = useBenefits();
  const refresh = useRefreshControl(benefits);

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

              <ACVELCard padding="xs">
                <ListItem icon={ReceiptText} title="Extrato de pontos" subtitle="Todas as movimentações" onPress={() => router.push(routes.pointsStatement)} divider />
                <ListItem icon={ListChecks} title="Meus resgates" subtitle="Andamento e cancelamento" onPress={() => router.push(routes.redemptions)} />
              </ACVELCard>

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
                <ACVELCard padding="xs">
                  <ListItem icon={BookOpen} title="Regras e meus indicados" onPress={() => router.push(routes.referral)} />
                </ACVELCard>
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
                        accessibilityHint="Abre os detalhes da recompensa"
                        trailing={!reward.available ? <StatusChip label="Esgotado" tone="neutral" size="sm" /> : !affordable ? <StatusChip label="Pontos insuficientes" tone="neutral" size="sm" /> : undefined}
                        onPress={() => router.push(routes.reward(reward.id))}
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

            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}
