import type { AppAction, NotificationCategory } from "@/types/domain";

/**
 * Backend notifications carry web-portal links (`dados.link`) and a `tipo`.
 * These helpers translate them to app actions/categories — used for the
 * in-app list today and for push payloads once push is enabled.
 */
const LINK_RULES: readonly { pattern: RegExp; action: (match: RegExpExecArray, query: URLSearchParams) => AppAction | null }[] = [
  { pattern: /^\/pagamentos\/(?:pix|boleto)\/?$/, action: (_, query) => { const id = query.get("fatura") ?? query.get("id"); return id ? { type: "INVOICE_PAYMENT", resourceId: id } : { type: "INVOICES" }; } },
  { pattern: /^\/faturas\/([^/]+)\/?$/, action: (match) => (match[1] ? { type: "INVOICE_DETAILS", resourceId: decodeURIComponent(match[1]) } : null) },
  { pattern: /^\/faturas\/?$/, action: () => ({ type: "INVOICES" }) },
  { pattern: /^\/(?:minhas-residencias|residencias)\/([^/]+)(?:\/editar)?\/?$/, action: (match) => (match[1] && match[1] !== "nova" ? { type: "RESIDENCE_DETAILS", resourceId: decodeURIComponent(match[1]) } : { type: "NEW_RESIDENCE" }) },
  { pattern: /^\/(?:minhas-residencias|residencias)\/?$/, action: () => ({ type: "RESIDENCES" }) },
  { pattern: /^\/suporte\/([^/]+)\/?$/, action: (match) => (match[1] && match[1] !== "novo" ? { type: "SUPPORT_TICKET", resourceId: decodeURIComponent(match[1]) } : { type: "SUPPORT" }) },
  { pattern: /^\/suporte\/?$/, action: () => ({ type: "SUPPORT" }) },
  { pattern: /^\/(?:economia|bi)\/?/, action: () => ({ type: "ECONOMY" }) },
  { pattern: /^\/(?:pontos|marketplace|indicacao)\/?/, action: () => ({ type: "BENEFITS" }) },
  { pattern: /^\/perfil\/documentos\/?/, action: () => ({ type: "DOCUMENTS" }) },
  { pattern: /^\/(?:dashboard|inicio)?\/?$/, action: () => ({ type: "HOME" }) }
];

/** Maps a portal link (absolute or relative) to an in-app action; unknown/external links → null. */
export function actionFromLink(link: string | null | undefined): AppAction | null {
  if (!link) return null;
  const trimmed = link.trim();
  // Only same-app relative paths are trusted (never open arbitrary external URLs from payloads).
  const relative = trimmed.replace(/^https?:\/\/[^/]+/i, "");
  if (!relative.startsWith("/")) return null;
  const [path = "", search = ""] = relative.split("?");
  const query = new URLSearchParams(search);
  for (const rule of LINK_RULES) {
    const match = rule.pattern.exec(path);
    if (match) return rule.action(match, query);
  }
  return null;
}

export function categoryFromType(type: string | null | undefined): NotificationCategory {
  const value = (type ?? "").toUpperCase();
  if (/FATURA|INVOICE|PAGAMENTO|COBRANCA/.test(value)) return "FATURAS";
  if (/ECONOMIA|SAVINGS|COMISSAO/.test(value)) return "ECONOMIA";
  if (/PONTO|POINTS|MARKETPLACE|PEDIDO|INDICACAO|RESGATE/.test(value)) return "BENEFICIOS";
  if (/TICKET|SUPORTE|SUPPORT/.test(value)) return "SUPORTE";
  if (/DOCUMENTO|CADASTRO|ONBOARDING|UC_|RESIDENCIA|CONTRATO/.test(value)) return "CADASTRO";
  return "SISTEMA";
}
