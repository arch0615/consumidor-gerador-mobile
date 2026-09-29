import type { Href } from "expo-router";
import type { AppAction } from "@/types/domain";

/**
 * Single place that knows the URL structure. Screens call these builders
 * instead of hand-writing paths (keeps deep links and pushes consistent).
 */
export const routes = {
  home: "/" satisfies Href,
  invoices: "/invoices" satisfies Href,
  economy: "/economy" satisfies Href,
  benefits: "/benefits" satisfies Href,
  account: "/account" satisfies Href,
  notifications: "/notifications" satisfies Href,
  invoice: (id: string): Href => ({ pathname: "/invoice/[id]", params: { id } }),
  invoicePix: (id: string): Href => ({ pathname: "/invoice/[id]/pix", params: { id } }),
  invoiceBoleto: (id: string): Href => ({ pathname: "/invoice/[id]/boleto", params: { id } }),
  payments: "/invoice/payments" satisfies Href,
  residences: "/residence" satisfies Href,
  residence: (id: string): Href => ({ pathname: "/residence/[id]", params: { id } }),
  newResidence: "/residence/new" satisfies Href,
  editResidence: (id: string): Href => ({ pathname: "/residence/new", params: { edit: id } }),
  support: "/support" satisfies Href,
  ticket: (id: string): Href => ({ pathname: "/support/[id]", params: { id } }),
  newTicket: "/support/new" satisfies Href,
  profile: "/account/profile" satisfies Href,
  settings: "/account/settings" satisfies Href,
  documents: "/account/documents" satisfies Href,
  security: "/account/security" satisfies Href,
  deleteAccount: "/account/delete" satisfies Href
} as const;

/** Maps backend-driven actions (alerts, notifications) to app routes. */
export function hrefForAction(action: AppAction): Href {
  switch (action.type) {
    case "INVOICES":
      return routes.invoices;
    case "INVOICE_DETAILS":
      return routes.invoice(action.resourceId);
    case "INVOICE_PAYMENT":
      return routes.invoicePix(action.resourceId);
    case "RESIDENCES":
      return routes.residences;
    case "RESIDENCE_DETAILS":
      return routes.residence(action.resourceId);
    case "NEW_RESIDENCE":
      return routes.newResidence;
    case "SUPPORT":
      return routes.support;
    case "SUPPORT_TICKET":
      return routes.ticket(action.resourceId);
    case "ECONOMY":
      return routes.economy;
    case "DOCUMENTS":
      return routes.documents;
    case "BENEFITS":
      return routes.benefits;
    case "HOME":
      return routes.home;
  }
}
