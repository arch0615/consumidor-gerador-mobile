import {
  EmailAuthProvider,
  getIdToken,
  onIdTokenChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from "@react-native-firebase/auth";
import { z } from "zod";
import type { AccountIdentity, RegisterInput } from "@/types/domain";
import { AppError, toAppError, type AppErrorCode } from "@/utils/app-error";
import { api } from "../api/apiClient";
import type { AuthService, RestoreResult } from "../auth.service";
import { authStateReady, firebaseAuth, type FirebaseUser } from "../firebase/firebase";
import { fetchMe } from "./me";

// ── Firebase error mapping ────────────────────────────────────────────

const FIREBASE_ERRORS: Readonly<Record<string, AppErrorCode>> = {
  "auth/invalid-credential": "INVALID_CREDENTIALS",
  "auth/invalid-login-credentials": "INVALID_CREDENTIALS",
  "auth/wrong-password": "INVALID_CREDENTIALS",
  "auth/user-not-found": "INVALID_CREDENTIALS",
  "auth/invalid-email": "INVALID_CREDENTIALS",
  "auth/too-many-requests": "RATE_LIMITED",
  "auth/network-request-failed": "NETWORK_UNAVAILABLE",
  "auth/user-disabled": "ACCOUNT_BLOCKED",
  "auth/user-token-expired": "AUTH_TOKEN_EXPIRED",
  "auth/requires-recent-login": "AUTH_REQUIRED",
  "auth/weak-password": "WEAK_PASSWORD",
  "auth/email-already-in-use": "EMAIL_ALREADY_REGISTERED"
};

/** Native Firebase errors (NativeFirebaseError) expose a string  such as "auth/invalid-credential". */
function firebaseCode(error: unknown): string | null {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null;
}

function fromFirebase(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const code = firebaseCode(error);
  return code ? new AppError(FIREBASE_ERRORS[code] ?? "UNKNOWN") : toAppError(error);
}

// ── Implementation ────────────────────────────────────────────────────

/** Account states that must never reach the signed-in area. */
const REJECTED_CODES: ReadonlySet<AppErrorCode> = new Set(["ACCOUNT_NOT_PROVISIONED", "ACCOUNT_BLOCKED", "FORBIDDEN"]);

let signingOut = false;

async function signOutQuietly(): Promise<void> {
  signingOut = true;
  try {
    await firebaseSignOut(firebaseAuth());
  } finally {
    signingOut = false;
  }
}

/** Validates the Firebase session with the backend; rejected accounts are signed out. */
async function validatedIdentity(): Promise<AccountIdentity> {
  try {
    return (await fetchMe()).identity;
  } catch (error) {
    const appError = toAppError(error);
    if (REJECTED_CODES.has(appError.code) || appError.code === "AUTH_TOKEN_EXPIRED") await signOutQuietly();
    throw appError;
  }
}

/** Waits for the native SDK to restore the persisted session, then returns the user. */
async function currentUser(): Promise<FirebaseUser | null> {
  const auth = firebaseAuth();
  return auth.currentUser ?? (await authStateReady(auth));
}

export const remoteAuthService: AuthService = {
  kind: "api",
  demoCredentials: null,

  async restoreSession(): Promise<RestoreResult> {
    const user = await currentUser();
    if (!user) return { kind: "signedOut" };
    try {
      return { kind: "signedIn", identity: await validatedIdentity() };
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === "AUTH_TOKEN_EXPIRED" || appError.code === "AUTH_REQUIRED") return { kind: "signedOut" };
      if (REJECTED_CODES.has(appError.code)) return { kind: "rejected", message: appError.message };
      // Offline / 5xx: keep the local session; screens fetch (and re-validate) when online.
      return { kind: "signedIn", identity: null };
    }
  },

  async signIn(email, password) {
    try {
      await signInWithEmailAndPassword(firebaseAuth(), email.trim().toLowerCase(), password);
    } catch (error) {
      throw fromFirebase(error);
    }
    return validatedIdentity();
  },

  async register(input: RegisterInput) {
    await api.post("auth", "/v1/auth/register", z.object({ userId: z.string(), email: z.string() }), {
      authenticated: false,
      body: {
        displayName: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        // The API accepts national digits (DDD + number) and stores E.164.
        phoneNumber: input.phone
      }
    });
    return remoteAuthService.signIn(input.email, input.password);
  },

  async requestPasswordReset(email) {
    try {
      await sendPasswordResetEmail(firebaseAuth(), email.trim().toLowerCase());
    } catch (error) {
      const code = firebaseCode(error);
      if (code === "auth/user-not-found" || code === "auth/invalid-email") return;
      throw fromFirebase(error);
    }
  },

  async signOut() {
    await signOutQuietly();
  },

  async reauthenticate(password) {
    const user = await currentUser();
    if (!user?.email) throw new AppError("AUTH_REQUIRED");
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    } catch (error) {
      const appError = fromFirebase(error);
      throw appError.code === "INVALID_CREDENTIALS" ? new AppError("INVALID_CREDENTIALS", "Senha incorreta.") : appError;
    }
  },

  async renewSession(password) {
    const user = await currentUser();
    if (!user?.email) throw new AppError("AUTH_REQUIRED");
    try {
      await signInWithEmailAndPassword(firebaseAuth(), user.email, password);
    } catch (error) {
      throw fromFirebase(error);
    }
  },

  getIdentity: () => validatedIdentity(),

  async getIdToken(forceRefresh) {
    const user = firebaseAuth().currentUser;
    if (!user) return null;
    try {
      return await getIdToken(user, forceRefresh);
    } catch (error) {
      const appError = fromFirebase(error);
      // Revoked/expired refresh token: no token (→ 401 handling); offline: surface the network error.
      if (appError.code === "NETWORK_UNAVAILABLE") throw appError;
      return null;
    }
  },

  onSessionLost(listener) {
    let active = false;
    const unsubscribe = onIdTokenChanged(firebaseAuth(), (user) => {
      // The first callback reports the initial state; only later sign-outs mean "session lost".
      if (active && !user && !signingOut) listener();
      active = true;
    });
    return unsubscribe;
  }
};
