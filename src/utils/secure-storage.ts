import * as SecureStore from "expo-secure-store";
import type { ZodType } from "zod";

/**
 * Typed wrapper over Expo SecureStore (Keychain / Keystore).
 * Values are validated on read so corrupted or outdated data is discarded
 * instead of crashing the app.
 */
export const secureStorage = {
  async getJson<T>(key: string, schema: ZodType<T>): Promise<T | null> {
    try {
      const raw = await SecureStore.getItemAsync(key);
      if (raw === null) return null;
      const parsed = schema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },

  async setJson(key: string, value: unknown): Promise<void> {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Nothing stored under this key.
    }
  }
};

export const STORAGE_KEYS = {
  session: "acvel.session.v1",
  preferences: "acvel.preferences.v1",
  rememberedEmail: "acvel.login.email.v1"
} as const;
