import { Check } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { AppText } from "./AppText";

export interface ProgressStepsProps {
  steps: readonly string[];
  /** Zero-based index of the current step. */
  current: number;
  variant?: "bar" | "stepper";
}

/**
 * "bar": wizard header ("Etapa 2 de 4" + progress bar).
 * "stepper": pipeline status (e.g. residence Cadastro → Compensando).
 */
export function ProgressSteps({ steps, current, variant = "bar" }: ProgressStepsProps) {
  const theme = useTheme();
  const total = steps.length;
  const currentLabel = steps[current] ?? "";

  if (variant === "bar") {
    const progress = total > 0 ? (current + 1) / total : 0;
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Etapa ${current + 1} de ${total}: ${currentLabel}`}
        accessibilityValue={{ min: 1, max: total, now: current + 1 }}
        style={{ gap: theme.spacing.xs }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="overline" tone="brand">{`Etapa ${current + 1} de ${total}`}</AppText>
          <AppText variant="caption" tone="secondary">
            {currentLabel}
          </AppText>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceMuted, overflow: "hidden" }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: theme.colors.primary }} />
        </View>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={`Andamento: ${steps.map((step, i) => `${step} ${i < current ? "concluído" : i === current ? "atual" : "pendente"}`).join(", ")}`}
      style={{ flexDirection: "row", alignItems: "flex-start" }}
    >
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const dotColor = done || active ? theme.colors.primary : theme.colors.borderStrong;
        return (
          <View key={step} style={{ flex: 1, alignItems: "center", gap: theme.spacing.xxs }}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              <View style={{ flex: 1, height: 2, backgroundColor: index === 0 ? "transparent" : done || active ? theme.colors.primary : theme.colors.border }} />
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: dotColor,
                  backgroundColor: done ? theme.colors.primary : theme.colors.surface,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {done ? <Check size={12} color={theme.colors.textOnPrimary} strokeWidth={3} /> : active ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary }} /> : null}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: index === total - 1 ? "transparent" : done ? theme.colors.primary : theme.colors.border }} />
            </View>
            <AppText variant="caption" tone={active ? "brand" : done ? "primary" : "tertiary"} align="center" numberOfLines={2}>
              {step}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
