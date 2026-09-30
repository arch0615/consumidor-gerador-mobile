import { parseConfig } from "../env";

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

  it("requires every API URL when mocks are off (Firebase comes from the native files)", () => {
    const result = parseConfig({ EXPO_PUBLIC_USE_MOCKS: "false", EXPO_PUBLIC_AUTH_API_URL: URLS.EXPO_PUBLIC_AUTH_API_URL });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join("\n")).toMatch(/EXPO_PUBLIC_BUSINESS_API_URL/);
      expect(result.issues.join("\n")).toMatch(/EXPO_PUBLIC_RATEIO_API_URL/);
    }
  });

  it("defaults to real APIs (mocks must be opted in)", () => {
    const result = parseConfig({ ...URLS });
    expect(result.ok && result.config.useMocks).toBe(false);
  });

  it("rejects mocks in production builds", () => {
    const result = parseConfig({ EXPO_PUBLIC_APP_ENV: "production", EXPO_PUBLIC_USE_MOCKS: "true", ...URLS });
    expect(result.ok).toBe(false);
  });

  it("rejects non-https API URLs in production", () => {
    const result = parseConfig({ EXPO_PUBLIC_APP_ENV: "production", ...URLS, EXPO_PUBLIC_RATEIO_API_URL: "http://rateio.acvel.test" });
    expect(result.ok).toBe(false);
  });

  it("normalises trailing slashes", () => {
    const result = parseConfig({ ...URLS });
    expect(result.ok && result.config.authApiUrl).toBe("https://auth.acvel.test");
  });
});
