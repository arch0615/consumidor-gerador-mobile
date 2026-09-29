import { Check, Circle } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { PASSWORD_RULES } from "@/utils/validation";
import { AppText } from "../common/AppText";

/** Live password requirements (same rules as the passwordField schema). */
export function PasswordChecklist({ value }: { value: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xxs }} accessibilityLabel="Requisitos da senha">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        const Icon = met ? Check : Circle;
        return (
          <View
            key={rule.id}
            style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}
            accessible
            accessibilityLabel={`${rule.label}: ${met ? "atendido" : "pendente"}`}
          >
            <Icon size={theme.sizing.iconSm} color={met ? theme.colors.success.fg : theme.colors.textTertiary} />
            <AppText variant="footnote" tone={met ? "success" : "secondary"}>
              {rule.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
