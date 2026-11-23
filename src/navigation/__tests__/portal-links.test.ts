import { portalLinks } from "../portal-links";

jest.mock("@/config/env", () => ({ config: { consumidorAppUrl: "", termsUrl: "", privacyUrl: "" } }));

const PORTAL = "https://cliente.appacvel.com.br";

describe("consumer portal links (confirmed routes)", () => {
  const links = portalLinks({ consumidorAppUrl: PORTAL, termsUrl: "", privacyUrl: "" });

  it("builds the confirmed portal routes from the configured origin", () => {
    expect(links.login()).toBe(`${PORTAL}/auth/login`);
    expect(links.invoices()).toBe(`${PORTAL}/faturas`);
    expect(links.referral("ABC123")).toBe(`${PORTAL}/indicacao/ABC123`);
    expect(links.signup()).toBe(`${PORTAL}/auth/cadastro`);
    expect(links.signup(" LIC 01 ")).toBe(`${PORTAL}/auth/cadastro?codigo_representante=LIC%2001`);
  });

  it("uses one combined terms/privacy page by default", () => {
    expect(links.terms()).toBe(`${PORTAL}/termos-de-uso-e-privacidade`);
    expect(links.privacy()).toBe(`${PORTAL}/termos-de-uso-e-privacidade`);
    expect(links.legalIsCombined()).toBe(true);
  });

  it("honours explicit EXPO_PUBLIC_TERMS_URL / EXPO_PUBLIC_PRIVACY_URL", () => {
    const same = portalLinks({ consumidorAppUrl: PORTAL, termsUrl: `${PORTAL}/termos-de-uso-e-privacidade`, privacyUrl: `${PORTAL}/termos-de-uso-e-privacidade` });
    expect(same.legalIsCombined()).toBe(true);
    const split = portalLinks({ consumidorAppUrl: PORTAL, termsUrl: "https://x.test/termos", privacyUrl: "https://x.test/privacidade" });
    expect([split.terms(), split.privacy(), split.legalIsCombined()]).toEqual(["https://x.test/termos", "https://x.test/privacidade", false]);
  });

  it("returns null (action hidden) when the portal origin is not configured", () => {
    const none = portalLinks({ consumidorAppUrl: "", termsUrl: "", privacyUrl: "" });
    expect([none.login(), none.invoices(), none.referral("ABC"), none.terms(), none.privacy(), none.legalIsCombined()]).toEqual([null, null, null, null, null, false]);
    expect(links.referral("  ")).toBeNull();
  });
});
