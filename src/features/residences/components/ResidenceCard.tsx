import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";
import { ACVELCard, AppText, StatusChip } from "@/components";
import { useTheme } from "@/theme";
import type { Residence } from "@/types/domain";
import { RESIDENCE_STATUS, RESIDENCE_TYPE_LABEL } from "@/utils/status-labels";
import { RESIDENCE_TYPE_ICON, residenceAddressLine, residenceLocality } from "../residence-meta";

/** Unit summary card: type, address, UC/utility, status and next step. */
export function ResidenceCard({ residence, onPress }: { residence: Residence; onPress: () => void }) {
  const theme = useTheme();
  const status = RESIDENCE_STATUS[residence.status];
  const Icon = RESIDENCE_TYPE_ICON[residence.type];
  const addressLine = residenceAddressLine(residence);
  return (
    <ACVELCard
      onPress={onPress}
      accessibilityLabel={`${RESIDENCE_TYPE_LABEL[residence.type]}, ${addressLine}, UC ${residence.ucNumber}, ${status.label}`}
      accessibilityHint="Abre os detalhes da unidade"
    >
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          <View style={{ width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <Icon size={theme.sizing.iconLg} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {addressLine}
            </AppText>
            <AppText variant="footnote" tone="secondary" numberOfLines={1}>
              {residenceLocality(residence)}
            </AppText>
          </View>
          <ChevronRight size={theme.sizing.iconMd} color={theme.colors.textTertiary} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.xs }}>
          <AppText variant="footnote" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
            UC {residence.ucNumber} · {residence.utility}
          </AppText>
          <StatusChip status={status} size="sm" />
        </View>
        {residence.status !== "ATIVA_COMPENSANDO" ? (
          <AppText variant="footnote" tone={status.tone === "danger" ? "danger" : "secondary"}>
            {status.nextStep}
          </AppText>
        ) : null}
      </View>
    </ACVELCard>
  );
}
