import { WifiOff } from "lucide-react-native";
import { View } from "react-native";
import { useIsOnline } from "@/hooks/useNetworkStatus";
import { useTheme } from "@/theme";
import { AppText } from "../common/AppText";

/** Persistent banner shown while offline; cached content stays visible below. */
export function OfflineBanner() {
  const theme = useTheme();
  const online = useIsOnline();
  if (online) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        backgroundColor: theme.colors.warning.bg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.warning.border
      }}
    >
      <WifiOff size={theme.sizing.iconSm} color={theme.colors.warning.fg} />
      <AppText variant="footnote" tone="warning" style={{ flex: 1 }}>
        Sem conexão — exibindo os últimos dados salvos.
      </AppText>
    </View>
  );
}
