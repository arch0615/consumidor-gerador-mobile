import type { InvoiceFilters } from "@/types/domain";

/** Central query-key factory (invalidate by prefix, e.g. queryKeys.invoices.all). */
export const queryKeys = {
  identity: ["identity"] as const,
  profile: ["profile"] as const,
  deletionRequest: ["profile", "deletion-request"] as const,
  dashboard: ["dashboard"] as const,
  invoices: {
    all: ["invoices"] as const,
    list: (filters: InvoiceFilters) => ["invoices", "list", filters] as const,
    detail: (id: string) => ["invoices", "detail", id] as const,
    pix: (id: string) => ["invoices", "pix", id] as const,
    boleto: (id: string) => ["invoices", "boleto", id] as const,
    payments: ["invoices", "payments"] as const
  },
  economy: ["economy"] as const,
  residences: {
    all: ["residences"] as const,
    detail: (id: string) => ["residences", "detail", id] as const,
    utilities: ["residences", "utilities"] as const,
    availability: ["residences", "availability"] as const
  },
  notifications: {
    all: ["notifications"] as const,
    unreadCount: ["notifications", "unread-count"] as const,
    preferences: ["notifications", "preferences"] as const
  },
  support: {
    all: ["support"] as const,
    detail: (id: string) => ["support", "detail", id] as const,
    helpCenter: ["support", "help-center"] as const
  },
  documents: ["documents"] as const,
  benefits: ["benefits"] as const
} as const;
