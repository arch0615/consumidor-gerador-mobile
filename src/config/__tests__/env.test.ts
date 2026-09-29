import { parseConfig } from "../env";

const FIREBASE = {
  EXPO_PUBLIC_FIREBASE_API_KEY: "key",
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "acvel.firebaseapp.com",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "acvel",
  EXPO_PUBLIC_FIREBASE_APP_ID: "1:2:ios:3"
};

const URLS = {
  EXPO_PUBLIC_AUTH_API_URL: "https://auth.acvel.test/",
  EXPO_PUBLIC_BUSINESS_API_URL: "https://business.acvel.test",
  EXPO_PUBLIC_RATEIO_API_URL: "https://rateio.acvel.test"
};

describe("parseConfig", () => {
  it("accepts mocks in development without URLs", () => {
    const result = parseConfig({ EXPO_PUBLIC_USE_MOCKS: "true" });
    expect(result.ok && result.config.useMocks).toBe(true);
  });

  it("requires API URLs and Firebase when mocks are off", () => {
    const result = parseConfig({ EXPO_PUBLIC_USE_MOCKS: "false" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join("\n")).toMatch(/EXPO_PUBLIC_AUTH_API_URL/);
      expect(result.issues.join("\n")).toMatch(/firebase/);
    }
  });

  it("defaults to real APIs (mocks must be opted in)", () => {
    const result = parseConfig({ ...URLS, ...FIREBASE });
    expect(result.ok && result.config.useMocks).toBe(false);
  });

  it("rejects mocks in production builds", () => {
    const result = parseConfig({ EXPO_PUBLIC_APP_ENV: "production", EXPO_PUBLIC_USE_MOCKS: "true", ...URLS, ...FIREBASE });
    expect(result.ok).toBe(false);
  });

  it("rejects non-https API URLs in production", () => {
    const result = parseConfig({ EXPO_PUBLIC_APP_ENV: "production", ...URLS, EXPO_PUBLIC_RATEIO_API_URL: "http://rateio.acvel.test", ...FIREBASE });
    expect(result.ok).toBe(false);
  });

  it("normalises trailing slashes", () => {
    const result = parseConfig({ ...URLS, ...FIREBASE });
    expect(result.ok && result.config.authApiUrl).toBe("https://auth.acvel.test");
  });
});
