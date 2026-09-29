import { config } from "@/config/env";
import type { AccountIdentity, RegisterInput } from "@/types/domain";
import { registerAuthBridge } from "./api/auth-bridge";
import { mockAuthService } from "./mock/auth.mock";
import { remoteAuthService } from "./remote/auth.remote";

/** Result of restoring a persisted session at launch. */
export type RestoreResult =
  | { kind: "signedIn"; identity: AccountIdentity | null }
  | { kind: "signedOut" }
  | { kind: "rejected"; message: string };

/**
 * Authentication boundary.
 * API: Firebase Auth (sign-in, reset, token refresh) + GET /v1/auth/me (identity, roles,
 * permissions, account status) + POST /v1/auth/register (public sign-up).
 * The app never decides identity or role by itself: every session is validated by the backend.
 */
export interface AuthService {
  readonly kind: "mock" | "api";
  /** Demo login shown on the Login screen (mock data layer only). */
  readonly demoCredentials: { email: string; password: string } | null;
  /** Waits for the persisted session and validates it (GET /v1/auth/me). */
  restoreSession(): Promise<RestoreResult>;
  signIn(email: string, password: string): Promise<AccountIdentity>;
  register(input: RegisterInput): Promise<AccountIdentity>;
  /** Always resolves for unknown e-mails (no account enumeration). */
  requestPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** Confirms the current password (before sensitive operations). */
  reauthenticate(password: string): Promise<void>;
  /** Signs in again with a new password (the backend revokes tokens after a password change). */
  renewSession(password: string): Promise<void>;
  getIdentity(): Promise<AccountIdentity>;
  getIdToken(forceRefresh: boolean): Promise<string | null>;
  /** Fires when the provider drops the session by itself (revoked/expired). Returns unsubscribe. */
  onSessionLost(listener: () => void): () => void;
}

export const authService: AuthService = config.useMocks ? mockAuthService : remoteAuthService;

// ── Session-expired signalling (API client → auth store) ──────────────

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/** Subscribes to "request still 401 after a token refresh". */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

registerAuthBridge({
  getIdToken: (forceRefresh) => authService.getIdToken(forceRefresh),
  onUnauthorized: () => unauthorizedListeners.forEach((listener) => listener())
});
