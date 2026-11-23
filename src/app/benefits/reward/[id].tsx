import { useRouter } from "expo-router";
import { Gift, ListChecks } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ACVELButton, ACVELCard, ACVELModal, AppText, InfoCard, QueryView, Screen, StatusChip } from "@/components";
import { useRedeemReward, useReward } from "@/features/benefits/hooks/useBenefits";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useRouteId } from "@/hooks/useRouteId";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";
import { errorMessage } from "@/utils/app-error";
import { formatPoints } from "@/utils/format";

/** Marketplace item detail + redemption request (portal /marketplace/[itemId]). */
export default function RewardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const rewardId = useRouteId();
  const reward = useReward(rewardId);
  const redeem = useRedeemReward();
  const refresh = useRefreshControl(reward);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const data = reward.data;
  const affordable = data !== undefined && data.reward.available && data.pointsBalance >= data.reward.pointsPrice;
  const canRedeem = affordable && !redeem.isSuccess;

  return (
    <Screen {...refresh} footer={canRedeem ? <ACVELButton label="Trocar pontos" icon={Gift} onPress={() => setConfirmOpen(true)} /> : undefined}>
      <QueryView query={reward} loading="detail" errorTitle="Recompensa indisponível">
        {({ reward: item, pointsBalance }) => (
          <View style={{ gap: theme.spacing.lg }}>
            <ACVELCard>
              <View style={{ gap: theme.spacing.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
                  <Gift size={theme.sizing.iconMd} color={theme.colors.primary} />
                  <AppText variant="footnote" tone="secondary">
                    {item.category}
                  </AppText>
                </View>
                <AppText variant="title2">{item.name}</AppText>
                <AppText variant="display">{formatPoints(item.pointsPrice)}</AppText>
                {!item.available ? <StatusChip label="Esgotado" tone="neutral" size="sm" /> : pointsBalance < item.pointsPrice ? <StatusChip label="Pontos insuficientes" tone="neutral" size="sm" /> : null}
                {item.longDescription ? (
                  <AppText variant="subhead" tone="secondary">
                    {item.longDescription}
                  </AppText>
                ) : null}
              </View>
            </ACVELCard>

            <ACVELCard variant="muted">
              <AppText variant="subhead" tone="secondary">
                Seu saldo disponível
              </AppText>
              <AppText variant="title3">{formatPoints(pointsBalance)}</AppText>
            </ACVELCard>

            <InfoCard tone="info" title="Como funciona" message="A solicitação reserva os pontos e o estoque. O débito ocorre após a aprovação da ACVEL; enquanto estiver aguardando, você pode cancelar em Meus resgates." />

            {redeem.isSuccess ? (
              <InfoCard tone="success" title="Resgate solicitado!" message="Seus pontos ficam reservados até a aprovação do pedido." actionLabel="Ver meus resgates" onAction={() => router.push(routes.redemptions)} />
            ) : null}
            {redeem.isError ? <InfoCard tone="danger" title="Não foi possível trocar" message={errorMessage(redeem.error)} /> : null}

            <ACVELButton label="Meus resgates" variant="secondary" icon={ListChecks} onPress={() => router.push(routes.redemptions)} />
          </View>
        )}
      </QueryView>

      <ACVELModal
        visible={confirmOpen}
        icon={Gift}
        title={data ? `Trocar por ${data.reward.name}?` : ""}
        message={data ? `Serão reservados ${formatPoints(data.reward.pointsPrice)} do seu saldo até a aprovação.` : undefined}
        confirmLabel="Confirmar troca"
        confirmLoading={redeem.isPending}
        onCancel={() => !redeem.isPending && setConfirmOpen(false)}
        onConfirm={() => redeem.mutate(rewardId, { onSettled: () => setConfirmOpen(false), onSuccess: () => void reward.refetch() })}
      />
    </Screen>
  );
}
