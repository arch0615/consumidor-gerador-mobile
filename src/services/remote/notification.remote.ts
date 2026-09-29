import { z } from "zod";
import type { AppNotification, NotificationChannel, NotificationPreferences, NotificationSettings } from "@/types/domain";
import { isAppError } from "@/utils/app-error";
import { api } from "../api/apiClient";
import { zId, zIgnoredBody, zList, zNumber, zStringOrEmpty, zStringOrNull } from "../api/schema";
import { actionFromLink, categoryFromType } from "../notification-actions";
import type { NotificationService } from "../notification.service";

const notificationSchema = z
  .object({
    id: zId,
    tipo: zStringOrNull,
    titulo: zStringOrEmpty,
    mensagem: zStringOrEmpty,
    created_at: zStringOrNull,
    lida: z.boolean().default(false),
    dados: z.object({ link: zStringOrNull }).nullish()
  })
  .transform(
    (item): AppNotification => ({
      id: item.id,
      category: categoryFromType(item.tipo),
      title: item.titulo || "Aviso ACVEL",
      message: item.mensagem,
      createdAt: item.created_at ?? new Date(0).toISOString(),
      read: item.lida,
      action: actionFromLink(item.dados?.link)
    })
  );

const unreadSchema = z.object({ count: zNumber });

const preferencesSchema = z.object({
  email_enabled: z.boolean().default(true),
  push_enabled: z.boolean().default(true),
  whatsapp_enabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  categorias: z.record(z.string(), z.boolean()).nullish()
});

/**
 * The preferences API persists e-mail, push and the MARKETING category only
 * (WhatsApp/SMS are read-only here until the backend supports them).
 */
const EDITABLE: readonly NotificationChannel[] = ["push", "email", "marketing"];

function toSettings(raw: z.output<typeof preferencesSchema>): NotificationSettings {
  return {
    values: {
      push: raw.push_enabled,
      email: raw.email_enabled,
      whatsapp: raw.whatsapp_enabled ?? false,
      sms: raw.sms_enabled ?? false,
      marketing: raw.categorias?.MARKETING !== false
    },
    editable: EDITABLE
  };
}

function toBackend(preferences: NotificationPreferences) {
  return {
    email_enabled: preferences.email,
    push_enabled: preferences.push,
    in_app_enabled: true,
    categorias: { FATURA_GERADA: preferences.email || preferences.push, SISTEMA: true, MARKETING: preferences.marketing }
  };
}

export function fetchUnreadCount(): Promise<number> {
  return api.get("business", "/v1/notificacoes/nao-lidas/count", unreadSchema).then((result) => result.count);
}

export const remoteNotificationService: NotificationService = {
  async list() {
    const items = await api.get("business", "/v1/notificacoes", zList(notificationSchema), { query: { perPage: 50 } });
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  unreadCount: fetchUnreadCount,

  async markRead(notificationId) {
    await api.patch("business", `/v1/notificacoes/${encodeURIComponent(notificationId)}/ler`, zIgnoredBody);
  },

  async markAllRead() {
    await api.post("business", "/v1/notificacoes/ler-todas", zIgnoredBody);
  },

  async getSettings() {
    try {
      return toSettings(await api.get("business", "/v1/notificacoes/preferencias", preferencesSchema));
    } catch (error) {
      // No preferences stored yet → backend defaults.
      if (isAppError(error, "RESOURCE_NOT_FOUND")) return toSettings(preferencesSchema.parse({}));
      throw error;
    }
  },

  async updatePreferences(preferences) {
    await api.put("business", "/v1/notificacoes/preferencias", zIgnoredBody, { body: toBackend(preferences) });
    return remoteNotificationService.getSettings();
  }
};
