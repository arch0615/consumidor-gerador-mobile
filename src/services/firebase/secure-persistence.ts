import * as SecureStore from "expo-secure-store";
import type { ReactNativeAsyncStorage } from "firebase/auth";

/**
 * Firebase Auth persistence backed by the OS keychain/keystore (instead of
 * plain AsyncStorage) — the persisted user holds the refresh token.
 *
 * SecureStore keys only allow [A-Za-z0-9._-] and values may be rejected above
 * ~2 KB, so keys are encoded and values split into chunks.
 */
const CHUNK_SIZE = 1800;
const PREFIX = "acvel.fb.";

function encodeKey(key: string): string {
  return PREFIX + key.replace(/[^A-Za-z0-9._-]/g, (char) => `_${char.charCodeAt(0).toString(16)}`);
}

async function readCount(base: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(`${base}.n`);
  const count = raw === null ? 0 : Number(raw);
  return Number.isInteger(count) && count > 0 ? count : 0;
}

async function removeChunks(base: string): Promise<void> {
  const count = await readCount(base);
  await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${base}.${index}`)));
  await SecureStore.deleteItemAsync(`${base}.n`);
}

export const secureAuthStorage: ReactNativeAsyncStorage = {
  async getItem(key) {
    const base = encodeKey(key);
    const count = await readCount(base);
    if (count === 0) return null;
    const chunks = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${base}.${index}`)));
    // A missing chunk means a torn write: treat as signed out rather than returning corrupt data.
    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join("");
  },

  async setItem(key, value) {
    const base = encodeKey(key);
    await removeChunks(base);
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let index = 0; index < count; index += 1) {
      await SecureStore.setItemAsync(`${base}.${index}`, value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(`${base}.n`, String(count));
  },

  async removeItem(key) {
    await removeChunks(encodeKey(key));
  }
};
