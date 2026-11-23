import { Gift, PackageX } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ACVELButton, ACVELCard, ACVELModal, AppText, InfoCard, QueryView, Screen, StatusChip } from "@/components";
import { useCancelRedemption, useRedemptions } from "@/features/benefits/hooks/useBenefits";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useTheme } from "@/theme";
import type { Redemption } from "@/types/domain";
import { errorMessage } from "@/utils/app-error";
import { formatDate, formatPoints } from "@/utils/format";
import { REDEMPTION_STATUS } from "@/utils/status-labels";

/** "Meus resgates" (portal /marketplace/resgates): history + cancel while awaiting approval. */
export default function RedemptionsScreen() {
  const theme = useTheme();
  const redemptions = useRedemptions();
  const cancel = useCancelRedemption();
  const refresh = useRefreshControl(redemptions);
  const [pending, setPending] = useState<Redemption | null>(null);

  return (
    <Screen {...refresh}>
      {cancel.isSuccess ? <InfoCard tone="success" title="Resgate cancelado" message="Os pontos reservados voltaram para o seu saldo." /> : null}
      {cancel.isError ? <InfoCard tone="danger" title="Não foi possível cancelar" message={errorMessage(cancel.error)} /> : null}
      <QueryView
        query={redemptions}
        loading="list"
        isEmpty={(list) => list.length === 0}
        empty={{ icon: Gift, title: "Nenhum resgate ainda", message: "As recompensas que você solicitar aparecem aqui com o andamento do pedido." }}
      >
        {(list) => (
          <View style={{ gap: theme.spacing.sm }}>
            {list.map((item) => (
              <ACVELCard key={item.id}>
                <View style={{ gap: theme.spacing.xs }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm }}>
                    <AppText variant="subheadStrong" style={{ flex: 1 }} numberOfLines={2}>
                      {item.rewardName}
                    </AppText>
                    <StatusChip status={REDEMPTION_STATUS[item.status]} size="sm" />
                  </View>
                  <AppText variant="footnote" tone="secondary">
                    {formatPoints(item.points)} · solicitado em {formatDate(item.createdAt.slice(0, 10))}
                  </AppText>
                  {item.status === "PENDENTE" ? (
                    <ACVELButton label="Cancelar resgate" variant="secondary" size="sm" icon={PackageX} onPress={() => setPending(item)} />
                  ) : null}
                </View>
              </ACVELCard>
            ))}
          </View>
        )}
      </QueryView>

      <ACVELModal
        visible={pending !== null}
        tone="destructive"
        icon={PackageX}
        title="Cancelar este resgate?"
        message={pending ? `${pending.rewardName}: os ${formatPoints(pending.points)} reservados voltam para o seu saldo.` : undefined}
        confirmLabel="Cancelar resgate"
        cancelLabel="Voltar"
        confirmLoading={cancel.isPending}
        onCancel={() => !cancel.isPending && setPending(null)}
        onConfirm={() => pending && cancel.mutate({ id: pending.id, version: pending.version }, { onSettled: () => setPending(null) })}
      />
    </Screen>
  );
}
