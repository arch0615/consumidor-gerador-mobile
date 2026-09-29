import { Gift, Headset, Megaphone, PiggyBank, Receipt, UserCheck, type LucideIcon } from "lucide-react-native";
import type { ListItemIconTone } from "@/components/lists/ListItem";
import type { AppNotification, NotificationCategory } from "@/types/domain";

export const NOTIFICATION_CATEGORY_META: Record<NotificationCategory, { icon: LucideIcon; tone: ListItemIconTone }> = {
  FATURAS: { icon: Receipt, tone: "warning" },
  ECONOMIA: { icon: PiggyBank, tone: "success" },
  BENEFICIOS: { icon: Gift, tone: "brand" },
  SUPORTE: { icon: Headset, tone: "info" },
  CADASTRO: { icon: UserCheck, tone: "brand" },
  SISTEMA: { icon: Megaphone, tone: "neutral" }
};

export interface NotificationGroup {
  title: string;
  items: AppNotification[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Groups (already sorted) notifications into Hoje / Últimos 7 dias / Anteriores. */
export function groupNotifications(list: readonly AppNotification[], now: Date = new Date()): NotificationGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups: NotificationGroup[] = [
    { title: "Hoje", items: [] },
    { title: "Últimos 7 dias", items: [] },
    { title: "Anteriores", items: [] }
  ];
  for (const item of list) {
    const created = Date.parse(item.createdAt);
    const index = created >= startOfToday ? 0 : created >= startOfToday - 6 * DAY_MS ? 1 : 2;
    groups[index]?.items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}
