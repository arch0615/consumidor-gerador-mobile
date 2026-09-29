import { z } from "zod";
import { create } from "zustand";
import { secureStorage, STORAGE_KEYS } from "@/utils/secure-storage";

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

const preferencesSchema = z.object({
  themeMode: z.enum(THEME_MODES),
  hasSeenIntro: z.boolean()
});

type PersistedPreferences = z.infer<typeof preferencesSchema>;

interface PreferencesState extends PersistedPreferences {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
  markIntroSeen: () => void;
}

const DEFAULTS: PersistedPreferences = { themeMode: "system", hasSeenIntro: false };

function persist(state: PersistedPreferences): void {
  void secureStorage.setJson(STORAGE_KEYS.preferences, state);
}

/** Per-device UI preferences (not sensitive, but kept in SecureStore for a single storage API). */
export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  async hydrate() {
    const stored = await secureStorage.getJson(STORAGE_KEYS.preferences, preferencesSchema);
    set({ ...(stored ?? DEFAULTS), hydrated: true });
  },
  setThemeMode(mode) {
    set({ themeMode: mode });
    persist({ themeMode: mode, hasSeenIntro: get().hasSeenIntro });
  },
  markIntroSeen() {
    set({ hasSeenIntro: true });
    persist({ themeMode: get().themeMode, hasSeenIntro: true });
  }
}));
