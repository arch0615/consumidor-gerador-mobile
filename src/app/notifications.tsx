import { Stack, useRouter } from "expo-router";
import { BellOff, CheckCheck } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ACVELCard, EmptyState, IconButton, ListItem, QueryView, Screen, SectionHeader, SegmentedControl, type Segment } from "@/components";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/features/notifications/hooks/useNotifications";
import { groupNotifications, NOTIFICATION_CATEGORY_META } from "@/features/notifications/notification-meta";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { hrefForAction } from "@/navigation/routes";
import { useTheme } from "@/theme";
import type { AppNotification } from "@/types/domain";
import { formatRelativeTime } from "@/utils/format";
import { NOTIFICATION_CATEGORY_LABEL } from "@/utils/status-labels";

type Filter = "all" | "unread";
const FILTERS: readonly Segment<Filter>[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "Não lidas" }
];

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const refresh = useRefreshControl(notifications);
  const [filter, setFilter] = useState<Filter>("all");
  const unreadCount = notifications.data?.filter((item) => !item.read).length ?? 0;

  const open = (item: AppNotification) => {
    if (!item.read) markRead.mutate(item.id);
    if (item.action) router.push(hrefForAction(item.action));
  };

  return (
    <Screen {...refresh}>
      <Stack.Screen
        options={{
          headerRight: () =>
            unreadCount > 0 ? <IconButton icon={CheckCheck} accessibilityLabel="Marcar todas como lidas" onPress={() => markAllRead.mutate()} /> : null
        }}
      />
      <SegmentedControl segments={FILTERS} value={filter} onChange={setFilter} accessibilityLabel="Filtrar notificações" />
      <QueryView
        query={notifications}
        loadingRows={6}
        isEmpty={(list) => list.length === 0}
        empty={{ icon: BellOff, title: "Nenhuma notificação", message: "Avisos sobre faturas, economia e seu cadastro aparecem aqui." }}
      >
        {(list) => {
          const visible = filter === "unread" ? list.filter((item) => !item.read) : list;
          if (visible.length === 0) {
            return <EmptyState icon={CheckCheck} title="Tudo lido!" message="Você não tem notificações não lidas." action={{ label: "Ver todas", onPress: () => setFilter("all") }} />;
          }
          return (
            <View style={{ gap: theme.spacing.lg }}>
              {groupNotifications(visible).map((group) => (
                <View key={group.title} style={{ gap: theme.spacing.xs }}>
                  <SectionHeader title={group.title} />
                  <ACVELCard padding="xs">
                    {group.items.map((item, index) => {
                      const meta = NOTIFICATION_CATEGORY_META[item.category];
                      return (
                        <ListItem
                          key={item.id}
                          icon={meta.icon}
                          iconTone={meta.tone}
                          title={item.title}
                          subtitle={item.message}
                          caption={`${NOTIFICATION_CATEGORY_LABEL[item.category]} · ${formatRelativeTime(item.createdAt)}`}
                          unread={!item.read}
                          showChevron={item.action !== null}
                          onPress={() => open(item)}
                          divider={index < group.items.length - 1}
                        />
                      );
                    })}
                  </ACVELCard>
                </View>
              ))}
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}
