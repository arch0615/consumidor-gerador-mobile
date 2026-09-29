import { notificationPreferences, notifications } from "@/mock/notification";
import type { NotificationChannel, NotificationPreferences } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import type { NotificationService } from "../notification.service";
import { mockMutation, mockQuery } from "./mock-request";

const ALL_CHANNELS: readonly NotificationChannel[] = ["push", "email", "whatsapp", "sms", "marketing"];
const preferencesState: NotificationPreferences = { ...notificationPreferences };

export const mockNotificationService: NotificationService = {
  list: () => mockQuery(() => [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), () => []),

  unreadCount: () => mockQuery(() => notifications.filter((notification) => !notification.read).length, () => 0),

  markRead: (notificationId) =>
    mockMutation(() => {
      const notification = notifications.find((candidate) => candidate.id === notificationId);
      if (!notification) throw new AppError("RESOURCE_NOT_FOUND");
      notification.read = true;
    }),

  markAllRead: () =>
    mockMutation(() => {
      notifications.forEach((notification) => {
        notification.read = true;
      });
    }),

  getSettings: () => mockQuery(() => ({ values: preferencesState, editable: ALL_CHANNELS })),

  updatePreferences: (preferences) => mockMutation(() => ({ values: Object.assign(preferencesState, preferences), editable: ALL_CHANNELS }))
};
