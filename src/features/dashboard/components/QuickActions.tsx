import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { Building, FileText, Headset, Plus, Receipt, UserPlus, type LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href: Href;
}

const ACTIONS: readonly QuickAction[] = [
  { id: "invoices", label: "Faturas", icon: Receipt, href: routes.invoices },
  { id: "units", label: "Unidades", icon: Building, href: routes.residences },
  { id: "new-unit", label: "Nova unidade", icon: Plus, href: routes.newResidence },
  { id: "support", label: "Suporte", icon: Headset, href: routes.support },
  { id: "documents", label: "Documentos", icon: FileText, href: routes.documents },
  { id: "referral", label: "Indicar", icon: UserPlus, href: routes.benefits }
];

const COLUMNS = 3;

/** 3×2 grid of shortcuts (≥ 48pt targets, icon + label). */
export function QuickActions() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -theme.spacing.xxs }}>
      {ACTIONS.map((action) => (
        <View key={action.id} style={{ width: `${100 / COLUMNS}%`, padding: theme.spacing.xxs }}>
          <Pressable
            onPress={() => router.push(action.href)}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => ({
              minHeight: 88,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.xs,
              padding: theme.spacing.xs
            })}
          >
            <View style={{ width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <action.icon size={theme.sizing.iconMd} color={theme.colors.primary} />
            </View>
            <AppText variant="caption" align="center" numberOfLines={2}>
              {action.label}
            </AppText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
