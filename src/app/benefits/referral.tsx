import { Share2, Users } from "lucide-react-native";
import { Share, View } from "react-native";
import { ACVELButton, ACVELCard, AppText, Columns, CopyField, ListItem, MetricCard, QueryView, Screen, SectionHeader, StatusChip } from "@/components";
import { useReferralProgram } from "@/features/benefits/hooks/useBenefits";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useTheme } from "@/theme";
import { formatDate, formatPoints } from "@/utils/format";
import { REFERRAL_STATUS } from "@/utils/status-labels";

const HOW_TO = ["Compartilhe seu link exclusivo com amigos.", "O indicado deve concluir o cadastro e ativar a conta.", "Acompanhe o status na lista de indicados."] as const;
const CONDITIONS = ["A indicação precisa usar o seu link exclusivo.", "A recompensa é creditada após a validação da ativação.", "Contas canceladas antes da ativação não geram recompensa."] as const;

/** Referral program: rules + referred people (portal /indicacao, /indicacao/regras, /indicacao/meus-indicados). */
export default function ReferralScreen() {
  const theme = useTheme();
  const program = useReferralProgram();
  const refresh = useRefreshControl(program);

  return (
    <Screen {...refresh}>
      <QueryView query={program} loading="detail">
        {(data) => {
          const remaining = Math.max(data.monthlyLimit - data.usedThisMonth, 0);
          return (
            <View style={{ gap: theme.spacing.lg }}>
              <ACVELCard>
                <View style={{ gap: theme.spacing.md }}>
                  <CopyField label="Seu link de indicação" value={data.link} copyLabel="Copiar link" copiedMessage="Link de indicação copiado" numberOfLines={1} />
                  <ACVELButton
                    label="Compartilhar convite"
                    icon={Share2}
                    disabled={remaining === 0}
                    onPress={() => void Share.share({ message: `${data.inviteMessage || "Economize na conta de luz com energia limpa da ACVEL!"} ${data.link}` })}
                  />
                  <AppText variant="footnote" tone="secondary" align="center">
                    {remaining > 0 ? `Você ainda pode enviar ${remaining} de ${data.monthlyLimit} convites elegíveis este mês.` : "Limite mensal de indicações elegíveis atingido."}
                  </AppText>
                </View>
              </ACVELCard>

              <Columns>
                <MetricCard label="Indicados" value={String(data.invited)} caption={`${data.activeReferrals} ativos`} compact />
                <MetricCard label="Pontos ganhos" value={formatPoints(data.pointsEarned)} caption="com indicações" compact />
              </Columns>

              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Regras" />
                <ACVELCard>
                  <View style={{ gap: theme.spacing.xs }}>
                    <AppText variant="subheadStrong">Você ganha {formatPoints(data.rewardPoints)} quando o indicado se torna cliente ativo.</AppText>
                    <AppText variant="subhead" tone="secondary">
                      Os primeiros {data.monthlyLimit} cadastros feitos pelo seu link em cada mês podem gerar recompensa.
                    </AppText>
                    {[...HOW_TO, ...CONDITIONS].map((rule) => (
                      <AppText key={rule} variant="subhead">
                        • {rule}
                      </AppText>
                    ))}
                  </View>
                </ACVELCard>
              </View>

              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Meus indicados" />
                {data.referred.length === 0 ? (
                  <ACVELCard variant="muted">
                    <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                      <Users size={theme.sizing.iconMd} color={theme.colors.textSecondary} />
                      <AppText variant="subhead" tone="secondary" style={{ flex: 1 }}>
                        Quando alguém se cadastrar com o seu link, aparece aqui.
                      </AppText>
                    </View>
                  </ACVELCard>
                ) : (
                  <ACVELCard padding="xs">
                    {data.referred.map((person, index) => (
                      <ListItem
                        key={person.id}
                        title={person.name}
                        subtitle={`Cadastro em ${formatDate(person.createdAt.slice(0, 10))}${person.rewardPoints > 0 ? ` · ${formatPoints(person.rewardPoints)}` : ""}`}
                        trailing={<StatusChip status={REFERRAL_STATUS[person.status]} size="sm" />}
                        divider={index < data.referred.length - 1}
                      />
                    ))}
                  </ACVELCard>
                )}
              </View>
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}
