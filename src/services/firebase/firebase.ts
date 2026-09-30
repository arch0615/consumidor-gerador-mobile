import { getApp } from "@react-native-firebase/app";
import { getAuth, onAuthStateChanged, type Auth, type User } from "@react-native-firebase/auth";
import { AppError } from "@/utils/app-error";

/**
 * Firebase via @react-native-firebase (native SDKs).
 *
 * The default app is created by the native layer at process start from
 * `google-services-android.json` / `GoogleService-Info.plist` (app.json
 * `googleServicesFile`) — exactly once, with no config values in JS. The
 * signed-in user and its refresh token are persisted by the native SDK and
 * restored on launch; ID tokens are refreshed natively.
 */
export type FirebaseAuth = Auth;
export type FirebaseUser = User;

/** False when the native config files were not bundled (e.g. Expo Go or a misconfigured build). */
export function isFirebaseConfigured(): boolean {
  try {
    getApp();
    return true;
  } catch {
    return false;
  }
}

export function firebaseAuth(): FirebaseAuth {
  if (!isFirebaseConfigured()) throw new AppError("NOT_CONFIGURED");
  const auth = getAuth();
  auth.languageCode = "pt-BR";
  return auth;
}

/** Resolves once the native SDK has restored (or not) the persisted session. */
export function authStateReady(auth: FirebaseAuth): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
