import { Settings } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { AppText } from "../common/AppText";
import { StateView } from "./StateView";

/**
 * Shown instead of the app when the build configuration is invalid (missing
 * API URLs / Firebase keys, or mocks in production). Fails closed: nothing
 * else is rendered and no request is made. Variable names are listed only in
 * development builds.
 */
export function ConfigErrorScreen({ issues }: { issues: readonly string[] }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + theme.spacing.xl, paddingHorizontal: theme.spacing.md, paddingBottom: insets.bottom + theme.spacing.xl }}>
      <StateView icon={Settings} tone="warning" title="Aplicativo indisponível" message="Esta versão do aplicativo não está configurada corretamente. Atualize o app ou tente novamente mais tarde." />
      {__DEV__ ? (
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="subheadStrong">Configuração inválida (.env):</AppText>
          {issues.map((issue) => (
            <AppText key={issue} variant="footnote" tone="danger">
              • {issue}
            </AppText>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
