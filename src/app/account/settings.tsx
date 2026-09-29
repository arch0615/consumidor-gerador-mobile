import { Bell, Mail, MessageCircle, Megaphone, Smartphone } from "lucide-react-native";
import { View } from "react-native";
import { ACVELCard, AppText, QueryView, Screen, SectionHeader, SegmentedControl, SwitchListItem, type Segment } from "@/components";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/features/notifications/hooks/useNotifications";
import { usePreferencesStore, type ThemeMode } from "@/stores/preferences.store";
import { useTheme } from "@/theme";
import type { NotificationPreferences } from "@/types/domain";
import { errorMessage } from "@/utils/app-error";

const THEME_SEGMENTS: readonly Segment<ThemeMode>[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" }
];

const CHANNELS: readonly { key: keyof NotificationPreferences; title: string; subtitle: string; icon: typeof Bell }[] = [
  { key: "push", title: "Notificações no celular", subtitle: "Faturas, pagamentos e cadastro", icon: Bell },
  { key: "email", title: "E-mail", subtitle: "Faturas e comprovantes", icon: Mail },
  { key: "whatsapp", title: "WhatsApp", subtitle: "Lembretes de vencimento", icon: MessageCircle },
  { key: "sms", title: "SMS", subtitle: "Avisos urgentes", icon: Smartphone },
  { key: "marketing", title: "Novidades e ofertas", subtitle: "Benefícios e campanhas ACVEL", icon: Megaphone }
];

export default function SettingsScreen() {
  const theme = useTheme();
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const setThemeMode = usePreferencesStore((state) => state.setThemeMode);
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Aparência" />
        <SegmentedControl segments={THEME_SEGMENTS} value={themeMode} onChange={setThemeMode} accessibilityLabel="Tema do aplicativo" />
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Notificações" subtitle="Escolha como quer receber nossos avisos" />
        <QueryView query={preferences} loadingRows={5}>
          {({ values, editable }) => (
            <ACVELCard padding="xs">
              {CHANNELS.map((channel, index) => (
                <SwitchListItem
                  key={channel.key}
                  icon={channel.icon}
                  title={channel.title}
                  subtitle={editable.includes(channel.key) ? channel.subtitle : "Em breve pelo aplicativo"}
                  value={values[channel.key]}
                  disabled={!editable.includes(channel.key)}
                  onValueChange={(value) => update.mutate({ ...values, [channel.key]: value })}
                  divider={index < CHANNELS.length - 1}
                />
              ))}
            </ACVELCard>
          )}
        </QueryView>
        {update.isError ? (
          <AppText variant="footnote" tone="danger" accessibilityLiveRegion="polite">
            {errorMessage(update.error)} A preferência foi restaurada.
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}
