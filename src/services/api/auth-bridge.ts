/**
 * Connects the API client to the identity provider without importing it
 * (avoids a dependency cycle: auth service → api client → auth service).
 * The auth service registers itself at startup.
 */
export interface AuthBridge {
  /** Current Firebase ID token; `forceRefresh` asks the SDK for a new one. Null when signed out. */
  getIdToken(forceRefresh: boolean): Promise<string | null>;
  /** Called when a request is still 401 after one forced refresh (invalid/revoked session). */
  onUnauthorized(): void;
}

const SIGNED_OUT: AuthBridge = {
  getIdToken: () => Promise.resolve(null),
  onUnauthorized: () => undefined
};

let current: AuthBridge = SIGNED_OUT;

export function registerAuthBridge(bridge: AuthBridge): void {
  current = bridge;
}

export function authBridge(): AuthBridge {
  return current;
}
