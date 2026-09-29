import { create } from "zustand";
import { configResult } from "@/config/env";
import { authService, onUnauthorized } from "@/services/auth.service";
import type { AccountIdentity } from "@/types/domain";

export type AuthStatus = "restoring" | "signedOut" | "signedIn";

/** Why the user landed on Login without asking to sign out (shown as a banner). */
export interface SignOutNotice {
  tone: "warning" | "danger" | "info";
  title: string;
  message: string;
}

const EXPIRED_NOTICE: SignOutNotice = { tone: "warning", title: "Sua sessão expirou", message: "Entre novamente para continuar." };

interface AuthState {
  status: AuthStatus;
  /** Last identity validated by GET /v1/auth/me (null while offline at launch). */
  identity: AccountIdentity | null;
  notice: SignOutNotice | null;
  restore: () => Promise<void>;
  setSignedIn: (identity: AccountIdentity) => void;
  /** Local sign-out after the provider session ended (expired, revoked, blocked, deleted). */
  endSession: (notice: SignOutNotice | null) => Promise<void>;
  clearNotice: () => void;
}

/**
 * Routing state for the auth guard. Tokens are owned by the identity
 * provider (Firebase, persisted in SecureStore) — never stored here.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  status: "restoring",
  identity: null,
  notice: null,

  async restore() {
    const result = await authService.restoreSession().catch(() => ({ kind: "signedOut" }) as const);
    if (result.kind === "signedIn") set({ status: "signedIn", identity: result.identity, notice: null });
    else if (result.kind === "rejected") set({ status: "signedOut", identity: null, notice: { tone: "danger", title: "Acesso não permitido", message: result.message } });
    else set({ status: "signedOut", identity: null });
  },

  setSignedIn(identity) {
    set({ status: "signedIn", identity, notice: null });
  },

  async endSession(notice) {
    if (get().status === "signedOut") return;
    await authService.signOut().catch(() => undefined);
    set({ status: "signedOut", identity: null, notice });
  },

  clearNotice() {
    set({ notice: null });
  }
}));

/** Expired/revoked sessions (API 401 after refresh, or the provider dropping the user). */
function expireSession(): void {
  void useAuthStore.getState().endSession(EXPIRED_NOTICE);
}

onUnauthorized(expireSession);
// With an invalid configuration the identity provider is never initialised (fail closed).
if (configResult.ok) authService.onSessionLost(expireSession);
