import { config } from "@/config/env";
import type { AppNotification, NotificationPreferences, NotificationSettings } from "@/types/domain";
import { mockNotificationService } from "./mock/notification.mock";
import { remoteNotificationService } from "./remote/notification.remote";

/**
 * In-app notifications and channel preferences.
 * API (business): GET /v1/notificacoes, GET /v1/notificacoes/nao-lidas/count,
 * PATCH /v1/notificacoes/{id}/ler, POST /v1/notificacoes/ler-todas,
 * GET|PUT /v1/notificacoes/preferencias. Push registration: see services/push/push.ts.
 */
export interface NotificationService {
  list(): Promise<AppNotification[]>;
  unreadCount(): Promise<number>;
  markRead(notificationId: string): Promise<void>;
  markAllRead(): Promise<void>;
  getSettings(): Promise<NotificationSettings>;
  updatePreferences(preferences: NotificationPreferences): Promise<NotificationSettings>;
}

export const notificationService: NotificationService = config.useMocks ? mockNotificationService : remoteNotificationService;
