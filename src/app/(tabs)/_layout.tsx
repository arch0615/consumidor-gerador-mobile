import { CircleUser, Gift, House, PiggyBank, Receipt, type LucideIcon } from "lucide-react-native";
import { Tabs } from "expo-router/tabs";
import { fontFamily, useTheme } from "@/theme";

const TAB_ICONS: Record<string, LucideIcon> = {
  index: House,
  invoices: Receipt,
  economy: PiggyBank,
  benefits: Gift,
  account: CircleUser
};

/** Five-tab shell (no drawer/sidebar): Início · Faturas · Economia · Benefícios · Conta. */
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={({ route }) => {
        const Icon = TAB_ICONS[route.name] ?? House;
        return {
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarStyle: { backgroundColor: theme.colors.tabBar, borderTopColor: theme.colors.border },
          tabBarLabelStyle: { fontFamily: fontFamily.semibold, fontSize: theme.typography.caption.fontSize },
          tabBarAllowFontScaling: false,
          sceneStyle: { backgroundColor: theme.colors.canvas },
          tabBarIcon: ({ color, focused }) => <Icon size={theme.sizing.iconLg} color={color} strokeWidth={focused ? 2.4 : 2} />
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarAccessibilityLabel: "Início" }} />
      <Tabs.Screen name="invoices" options={{ title: "Faturas" }} />
      <Tabs.Screen name="economy" options={{ title: "Economia" }} />
      <Tabs.Screen name="benefits" options={{ title: "Benefícios" }} />
      <Tabs.Screen name="account" options={{ title: "Conta" }} />
    </Tabs>
  );
}
