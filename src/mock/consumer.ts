import type { UserProfile } from "@/types/domain";

/**
 * Demo consumer used by the mock auth/account services.
 * Login: demo@acvel.com.br / Acvel@123
 */
export const DEMO_CREDENTIALS = { email: "demo@acvel.com.br", password: "Acvel@123" } as const;

export const demoProfile: UserProfile = {
  userId: "usr_demo_001",
  consumerId: "cns_demo_001",
  displayName: "Mariana Albuquerque Costa",
  firstName: "Mariana",
  email: DEMO_CREDENTIALS.email,
  phone: "+5511987654321",
  personType: "FISICA",
  document: "52998224725",
  onboardingStatus: "APROVADO",
  onboardingCompleted: true,
  billingPreference: "UNIFICADA",
  referralCode: "MARIANA25",
  memberSince: "2025-11-04"
};

/** Template for accounts created through the mock registration flow. */
export function newConsumerProfile(input: { userId: string; name: string; email: string; phone: string }): UserProfile {
  const firstName = input.name.trim().split(/\s+/)[0] ?? input.name;
  return {
    userId: input.userId,
    consumerId: input.userId.replace("usr", "cns"),
    displayName: input.name.trim(),
    firstName,
    email: input.email,
    phone: `+55${input.phone}`,
    personType: "FISICA",
    // CPF/CNPJ is collected in the consumer onboarding, not at sign-up.
    document: "",
    onboardingStatus: "DRAFT",
    onboardingCompleted: false,
    billingPreference: "UNIFICADA",
    referralCode: `${firstName.toUpperCase().slice(0, 8)}10`,
    memberSince: new Date().toISOString().slice(0, 10)
  };
}
