import { CircleCheck, FileSignature, Search, Zap } from "lucide-react-native";
import { View } from "react-native";
import { ACVELCard, AppText, ListItem } from "@/components";
import { useTheme } from "@/theme";
import type { Residence } from "@/types/domain";

const NEXT_STEPS = [
  { icon: Search, title: "Análise do cadastro", subtitle: "Conferimos os dados em até 2 dias úteis" },
  { icon: FileSignature, title: "Assinatura do contrato", subtitle: "Você recebe o link por e-mail e no app" },
  { icon: Zap, title: "Conexão com a distribuidora", subtitle: "A compensação começa em até 90 dias" }
] as const;

export function StepConfirmation({ residence, resubmitted = false }: { residence: Residence; resubmitted?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ alignItems: "center", gap: theme.spacing.md, paddingTop: theme.spacing.lg }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: theme.colors.success.bg, alignItems: "center", justifyContent: "center" }}>
          <CircleCheck size={48} color={theme.colors.success.fg} />
        </View>
        <AppText variant="title1" align="center" accessibilityRole="header">
          {resubmitted ? "Cadastro reenviado!" : "Unidade enviada!"}
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          A UC {residence.ucNumber} ({residence.utility}) está em análise. Avisaremos você a cada etapa.
        </AppText>
      </View>
      <ACVELCard padding="xs">
        {NEXT_STEPS.map((step, index) => (
          <ListItem key={step.title} icon={step.icon} title={step.title} subtitle={step.subtitle} divider={index < NEXT_STEPS.length - 1} />
        ))}
      </ACVELCard>
    </View>
  );
}
