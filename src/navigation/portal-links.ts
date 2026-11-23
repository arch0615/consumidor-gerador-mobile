import { config, type AppConfig } from "@/config/env";

/**
 * Links to the consumer web portal (confirmed routes of cliente.appacvel.com.br). The origin and the
 * legal pages come from the environment (EXPO_PUBLIC_CONSUMIDOR_APP_URL, EXPO_PUBLIC_TERMS_URL,
 * EXPO_PUBLIC_PRIVACY_URL); only the route paths live here. Every builder returns null when the
 * portal origin is not configured, so callers hide the action instead of opening a broken link.
 *
 * Portal pages need the web session: the app never links to an invoice detail on the portal
 * (invoices are opened in the app; the portal is only offered at its list, /faturas).
 */
export const PORTAL_ROUTES = {
  login: "/auth/login",
  signup: "/auth/cadastro",
  invoices: "/faturas",
  referral: "/indicacao",
  /** Single combined page — there is no separate privacy route. */
  legal: "/termos-de-uso-e-privacidade"
} as const;

type PortalConfig = Pick<AppConfig, "consumidorAppUrl" | "termsUrl" | "privacyUrl">;

export function portalLinks(env: PortalConfig = config) {
  const origin = env.consumidorAppUrl;
  const at = (path: string): string | null => (origin ? `${origin}${path}` : null);
  const legalPage = at(PORTAL_ROUTES.legal);
  const terms = env.termsUrl || legalPage;
  const privacy = env.privacyUrl || terms;

  return {
    login: () => at(PORTAL_ROUTES.login),
    /** Consumer sign-up, optionally bound to a representative (licenciado) code — the link licenciados share. */
    signup: (representativeCode?: string) => {
      const url = at(PORTAL_ROUTES.signup);
      const code = representativeCode?.trim();
      return url && code ? `${url}?codigo_representante=${encodeURIComponent(code)}` : url;
    },
    invoices: () => at(PORTAL_ROUTES.invoices),
    /** Consumer referral link: <portal>/indicacao/<codigo>. */
    referral: (code: string) => {
      const trimmed = code.trim();
      return trimmed ? at(`${PORTAL_ROUTES.referral}/${encodeURIComponent(trimmed)}`) : null;
    },
    terms: () => terms,
    privacy: () => privacy,
    /** True when terms and privacy are the same combined page (one "Termos de uso e privacidade" entry). */
    legalIsCombined: () => terms !== null && terms === privacy
  };
}
