import { z } from "zod";

/**
 * Runtime configuration from EXPO_PUBLIC_* variables (see `.env.example`).
 *
 * Expo inlines EXPO_PUBLIC_* only when referenced statically
 * (`process.env.EXPO_PUBLIC_X`), so every variable is read explicitly below.
 * These values ship inside the app bundle: never put secrets here (Firebase
 * web API keys are public identifiers, not secrets).
 */
const optionalUrl = z
  .string()
  .trim()
  .transform((value) => value.replace(/\/+$/, ""))
  .refine((value) => value === "" || /^https?:\/\/\S+$/.test(value), "must be an http(s) URL");

const envSchema = z
  .object({
    appEnv: z.enum(["development", "preview", "production"]).default("development"),
    useMocks: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    authApiUrl: optionalUrl.default(""),
    businessApiUrl: optionalUrl.default(""),
    rateioApiUrl: optionalUrl.default(""),
    apiTimeoutMs: z.coerce.number().int().min(1000).max(120_000).default(20_000),
    firebase: z.object({
      apiKey: z.string().trim().default(""),
      authDomain: z.string().trim().default(""),
      projectId: z.string().trim().default(""),
      appId: z.string().trim().default("")
    }),
    cepApiUrl: optionalUrl.default("https://brasilapi.com.br/api/cep/v2"),
    portalUrl: optionalUrl.default("")
  })
  .superRefine((env, ctx) => {
    if (env.appEnv === "production" && env.useMocks) {
      ctx.addIssue({ code: "custom", path: ["useMocks"], message: "mocks are not allowed in production builds" });
    }
    if (env.useMocks) return;
    const required: readonly [keyof typeof env, string][] = [
      ["authApiUrl", "EXPO_PUBLIC_AUTH_API_URL"],
      ["businessApiUrl", "EXPO_PUBLIC_BUSINESS_API_URL"],
      ["rateioApiUrl", "EXPO_PUBLIC_RATEIO_API_URL"]
    ];
    for (const [key, name] of required) {
      const value = env[key];
      if (typeof value !== "string" || value === "") ctx.addIssue({ code: "custom", path: [key], message: `${name} is required when mocks are off` });
      else if (env.appEnv === "production" && !value.startsWith("https://")) {
        ctx.addIssue({ code: "custom", path: [key], message: `${name} must use https in production` });
      }
    }
    for (const [key, value] of Object.entries(env.firebase)) {
      if (value === "") ctx.addIssue({ code: "custom", path: ["firebase", key], message: "Firebase config is required when mocks are off" });
    }
  });

export type AppConfig = z.infer<typeof envSchema>;
export type ApiTarget = "auth" | "business" | "rateio";

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; issues: readonly string[] };

export function parseConfig(raw: Record<string, string | undefined>): ConfigResult {
  const blankToUndefined = (value: string | undefined) => (value === undefined || value.trim() === "" ? undefined : value);
  const parsed = envSchema.safeParse({
    appEnv: blankToUndefined(raw.EXPO_PUBLIC_APP_ENV),
    useMocks: blankToUndefined(raw.EXPO_PUBLIC_USE_MOCKS),
    authApiUrl: blankToUndefined(raw.EXPO_PUBLIC_AUTH_API_URL),
    businessApiUrl: blankToUndefined(raw.EXPO_PUBLIC_BUSINESS_API_URL),
    rateioApiUrl: blankToUndefined(raw.EXPO_PUBLIC_RATEIO_API_URL),
    apiTimeoutMs: blankToUndefined(raw.EXPO_PUBLIC_API_TIMEOUT_MS),
    firebase: {
      apiKey: blankToUndefined(raw.EXPO_PUBLIC_FIREBASE_API_KEY),
      authDomain: blankToUndefined(raw.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
      projectId: blankToUndefined(raw.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
      appId: blankToUndefined(raw.EXPO_PUBLIC_FIREBASE_APP_ID)
    },
    cepApiUrl: blankToUndefined(raw.EXPO_PUBLIC_CEP_API_URL),
    portalUrl: blankToUndefined(raw.EXPO_PUBLIC_PORTAL_URL)
  });
  if (parsed.success) return { ok: true, config: parsed.data };
  return { ok: false, issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
}

export const configResult: ConfigResult = parseConfig({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_USE_MOCKS: process.env.EXPO_PUBLIC_USE_MOCKS,
  EXPO_PUBLIC_AUTH_API_URL: process.env.EXPO_PUBLIC_AUTH_API_URL,
  EXPO_PUBLIC_BUSINESS_API_URL: process.env.EXPO_PUBLIC_BUSINESS_API_URL,
  EXPO_PUBLIC_RATEIO_API_URL: process.env.EXPO_PUBLIC_RATEIO_API_URL,
  EXPO_PUBLIC_API_TIMEOUT_MS: process.env.EXPO_PUBLIC_API_TIMEOUT_MS,
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  EXPO_PUBLIC_CEP_API_URL: process.env.EXPO_PUBLIC_CEP_API_URL,
  EXPO_PUBLIC_PORTAL_URL: process.env.EXPO_PUBLIC_PORTAL_URL
});

/**
 * Invalid configuration never falls back to mocks: the app renders a
 * configuration error screen (fail closed) and every API call is refused.
 */
const FAIL_CLOSED: AppConfig = {
  appEnv: "production",
  useMocks: false,
  authApiUrl: "",
  businessApiUrl: "",
  rateioApiUrl: "",
  apiTimeoutMs: 20_000,
  firebase: { apiKey: "", authDomain: "", projectId: "", appId: "" },
  cepApiUrl: "",
  portalUrl: ""
};

export const config: AppConfig = configResult.ok ? configResult.config : FAIL_CLOSED;

export function apiBaseUrl(target: ApiTarget): string {
  switch (target) {
    case "auth":
      return config.authApiUrl;
    case "business":
      return config.businessApiUrl;
    case "rateio":
      return config.rateioApiUrl;
  }
}
