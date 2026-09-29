import { create } from "zustand";
import type { AccountIdentity } from "@/types/domain";

/**
 * Holds the identity created by sign-up until the user leaves the success
 * screen (activating it earlier would swap the auth stack for the tabs).
 * Memory only.
 */
interface RegistrationState {
  pendingIdentity: AccountIdentity | null;
  setPending: (identity: AccountIdentity) => void;
  clear: () => void;
}

export const useRegistrationStore = create<RegistrationState>((set) => ({
  pendingIdentity: null,
  setPending: (pendingIdentity) => set({ pendingIdentity }),
  clear: () => set({ pendingIdentity: null })
}));
