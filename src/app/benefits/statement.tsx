import { ReceiptText } from "lucide-react-native";
import { View } from "react-native";
import { ACVELButton, ACVELCard, AppText, ListItem, QueryView, Screen } from "@/components";
import { usePointsStatement } from "@/features/benefits/hooks/useBenefits";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { useTheme } from "@/theme";
import { formatDate, formatPoints, formatSignedPoints } from "@/utils/format";

/** Full points statement (portal /pontos/extrato), loaded page by page. */
export default function PointsStatementScreen() {
  const theme = useTheme();
  const statement = usePointsStatement();
  const refresh = useRefreshControl(statement);

  return (
    <Screen {...refresh}>
      <QueryView
        query={statement}
        loading="list"
        isEmpty={(data) => data.pages.every((page) => page.entries.length === 0)}
        empty={{ icon: ReceiptText, title: "Nenhuma movimentação ainda", message: "Os pontos que você ganhar ou trocar aparecem aqui." }}
      >
        {(data) => {
          const entries = data.pages.flatMap((page) => page.entries);
          const balance = data.pages[0]?.balance ?? 0;
          return (
            <View style={{ gap: theme.spacing.md }}>
              <ACVELCard variant="muted">
                <AppText variant="subhead" tone="secondary">
                  Saldo atual
                </AppText>
                <AppText variant="title2">{formatPoints(balance)}</AppText>
              </ACVELCard>
              <ACVELCard padding="xs">
                {entries.map((entry, index) => (
                  <ListItem
                    key={entry.id}
                    title={entry.description}
                    subtitle={`${formatDate(entry.occurredAt.slice(0, 10))}${entry.status === "PENDENTE" ? " · em análise" : ""}`}
                    value={formatSignedPoints(entry.points)}
                    valueTone={entry.points >= 0 ? "success" : "danger"}
                    divider={index < entries.length - 1}
                  />
                ))}
              </ACVELCard>
              {statement.hasNextPage ? (
                <ACVELButton label="Carregar mais" variant="secondary" loading={statement.isFetchingNextPage} loadingLabel="Carregando…" onPress={() => void statement.fetchNextPage()} />
              ) : null}
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}
