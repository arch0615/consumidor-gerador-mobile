import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import { queryKeys } from "@/services/query-keys";
import type { AppNotification, NotificationPreferences, NotificationSettings } from "@/types/domain";

export function useNotifications() {
  return useQuery({ queryKey: queryKeys.notifications.all, queryFn: () => notificationService.list() });
}

export function useUnreadNotificationsCount() {
  return useQuery({ queryKey: queryKeys.notifications.unreadCount, queryFn: () => notificationService.unreadCount(), refetchInterval: 5 * 60_000 });
}

/** Optimistically flips `read` so the unread dot disappears immediately. */
function useReadMutation<V>(mutationFn: (variables: V) => Promise<void>, apply: (list: AppNotification[], variables: V) => AppNotification[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (variables: V) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const previous = queryClient.getQueryData<AppNotification[]>(queryKeys.notifications.all);
      if (previous) queryClient.setQueryData(queryKeys.notifications.all, apply(previous, variables));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.notifications.all, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    }
  });
}

export function useMarkNotificationRead() {
  return useReadMutation(
    (notificationId: string) => notificationService.markRead(notificationId),
    (list, notificationId) => list.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
  );
}

export function useMarkAllNotificationsRead() {
  return useReadMutation(
    () => notificationService.markAllRead(),
    (list) => list.map((item) => ({ ...item, read: true }))
  );
}

export function useNotificationPreferences() {
  return useQuery({ queryKey: queryKeys.notifications.preferences, queryFn: () => notificationService.getSettings() });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: NotificationPreferences) => notificationService.updatePreferences(preferences),
    onMutate: (preferences) => {
      const previous = queryClient.getQueryData<NotificationSettings>(queryKeys.notifications.preferences);
      if (previous) queryClient.setQueryData<NotificationSettings>(queryKeys.notifications.preferences, { ...previous, values: preferences });
      return { previous };
    },
    onSuccess: (settings) => queryClient.setQueryData(queryKeys.notifications.preferences, settings),
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.notifications.preferences, context.previous);
    }
  });
}
