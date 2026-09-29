import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from "firebase/auth";
import { config } from "@/config/env";
import { AppError } from "@/utils/app-error";
import { secureAuthStorage } from "./secure-persistence";

let auth: Auth | null = null;

/** Lazily initialised Firebase Auth (only in API mode; mocks never touch Firebase). */
export function firebaseAuth(): Auth {
  if (auth) return auth;
  const { apiKey, authDomain, projectId, appId } = config.firebase;
  if (!apiKey || !authDomain || !projectId || !appId) throw new AppError("NOT_CONFIGURED");
  const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp({ apiKey, authDomain, projectId, appId });
  try {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(secureAuthStorage) });
  } catch {
    // Fast Refresh re-evaluates this module: Auth may already be initialised.
    auth = getAuth(app);
  }
  auth.languageCode = "pt-BR";
  return auth;
}
