import { z } from "zod";
import { DEMO_CREDENTIALS, demoProfile, newConsumerProfile } from "@/mock/consumer";
import type { AccountIdentity, UserProfile } from "@/types/domain";
import { AppError } from "@/utils/app-error";
import { secureStorage, STORAGE_KEYS } from "@/utils/secure-storage";
import type { AuthService } from "../auth.service";
import { mockId, mockMutation } from "./mock-request";

// ── In-memory accounts (reset when the app reloads) ───────────────────

interface MockAccount {
  password: string;
  profile: UserProfile;
}

export const mockAccounts = new Map<string, MockAccount>([[DEMO_CREDENTIALS.email, { password: DEMO_CREDENTIALS.password, profile: demoProfile }]]);

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const mockSessionSchema = z.object({ userId: z.string().min(1), expiresAt: z.string() });

let currentUserId: string | null = null;
let failedAttempts = 0;

export function mockAccountByUserId(userId: string | null): MockAccount | undefined {
  return userId ? [...mockAccounts.values()].find((account) => account.profile.userId === userId) : undefined;
}

/** The signed-in mock account (identity comes from the session, never from screen input). */
export function currentMockAccount(): MockAccount {
  const account = mockAccountByUserId(currentUserId);
  if (!account) throw new AppError("AUTH_REQUIRED");
  return account;
}

function identityOf(profile: UserProfile): AccountIdentity {
  return {
    userId: profile.userId,
    email: profile.email,
    displayName: profile.displayName,
    firstName: profile.firstName,
    status: "ACTIVE",
    userType: "CONSUMIDOR",
    roles: ["consumidor_basico"],
    permissions: [],
    consumerId: profile.consumerId,
    isGenerator: false,
    onboardingStatus: profile.onboardingStatus,
    onboardingCompleted: profile.onboardingCompleted
  };
}

async function startSession(profile: UserProfile): Promise<AccountIdentity> {
  currentUserId = profile.userId;
  await secureStorage.setJson(STORAGE_KEYS.session, { userId: profile.userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() });
  return identityOf(profile);
}

export const mockAuthService: AuthService = {
  kind: "mock",
  demoCredentials: DEMO_CREDENTIALS,

  async restoreSession() {
    const stored = await secureStorage.getJson(STORAGE_KEYS.session, mockSessionSchema);
    const account = stored && Date.parse(stored.expiresAt) > Date.now() ? mockAccountByUserId(stored.userId) : undefined;
    if (!account) {
      await secureStorage.remove(STORAGE_KEYS.session);
      return { kind: "signedOut" };
    }
    currentUserId = account.profile.userId;
    return { kind: "signedIn", identity: identityOf(account.profile) };
  },

  async signIn(email, password) {
    const profile = await mockMutation(() => {
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        failedAttempts = 0;
        throw new AppError("RATE_LIMITED", "Muitas tentativas de acesso. Aguarde alguns minutos ou redefina sua senha.");
      }
      const account = mockAccounts.get(email.trim().toLowerCase());
      if (!account || account.password !== password) {
        failedAttempts += 1;
        throw new AppError("INVALID_CREDENTIALS");
      }
      failedAttempts = 0;
      return account.profile;
    });
    return startSession(profile);
  },

  async register(input) {
    const profile = await mockMutation(() => {
      const email = input.email.trim().toLowerCase();
      if (mockAccounts.has(email)) throw new AppError("EMAIL_ALREADY_REGISTERED");
      const created = newConsumerProfile({ userId: mockId("usr"), name: input.name, email, phone: input.phone });
      mockAccounts.set(email, { password: input.password, profile: created });
      return created;
    });
    return startSession(profile);
  },

  requestPasswordReset: () => mockMutation(() => undefined),

  async signOut() {
    currentUserId = null;
    await secureStorage.remove(STORAGE_KEYS.session);
  },

  reauthenticate: (password) =>
    mockMutation(() => {
      if (currentMockAccount().password !== password) throw new AppError("INVALID_CREDENTIALS", "Senha incorreta.");
    }),

  renewSession: () => Promise.resolve(),

  getIdentity: () => mockMutation(() => identityOf(currentMockAccount().profile)),

  getIdToken: () => Promise.resolve(currentUserId ? `mock-token-${currentUserId}` : null),

  onSessionLost: () => () => undefined
};
