/**
 * Domain types shared by services (mock and future API) and screens.
 * Shapes follow the backend domain model (web repo docs/domain-model.md),
 * normalised to camelCase for the app. Money values are numbers in BRL
 * (display only — authoritative calculations happen on the backend).
 */

export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // ISO-8601 with offset
export type Competencia = string; // YYYY-MM

// ───────────── Account ─────────────

export type PersonType = "FISICA" | "JURIDICA";
export type OnboardingStatus = "DRAFT" | "PENDING_SUBMISSION" | "EM_ANALISE" | "APROVADO" | "REPROVADO";
export type BillingMode = "UNIFICADA" | "SEPARADA";

export interface UserProfile {
  userId: string;
  consumerId: string;
  displayName: string;
  firstName: string;
  email: string;
  phone: string | null; // E.164
  personType: PersonType;
  document: string; // CPF or CNPJ digits
  onboardingStatus: OnboardingStatus;
  onboardingCompleted: boolean;
  billingPreference: BillingMode;
  referralCode: string;
  memberSince: ISODate;
}

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETION_REQUESTED" | "ANONYMIZED";
export type UserType = "CONSUMIDOR" | "GERADOR" | "LICENCIADO";

export interface Permission {
  resource: string;
  action: string;
  scope: string | null;
}

/**
 * Authenticated identity (GET /v1/auth/me). Decides routing and capabilities;
 * everything here is computed server-side from the verified token.
 */
export interface AccountIdentity {
  userId: string;
  email: string;
  displayName: string;
  firstName: string;
  status: UserStatus;
  userType: UserType | null;
  roles: readonly string[];
  permissions: readonly Permission[];
  consumerId: string | null;
  isGenerator: boolean;
  onboardingStatus: OnboardingStatus | "SUSPENSO" | null;
  onboardingCompleted: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string; // digits (DDD + number)
  password: string;
  acceptedTerms: true;
}

// ───────────── Dashboard ─────────────

export type AccountStatus = "ATIVO" | "EM_ANALISE" | "PENDENTE";
export type AlertTone = "info" | "warning" | "danger";

export type AppAction =
  | { type: "INVOICES" }
  | { type: "INVOICE_DETAILS"; resourceId: string }
  | { type: "INVOICE_PAYMENT"; resourceId: string }
  | { type: "RESIDENCES" }
  | { type: "RESIDENCE_DETAILS"; resourceId: string }
  | { type: "NEW_RESIDENCE" }
  | { type: "SUPPORT" }
  | { type: "SUPPORT_TICKET"; resourceId: string }
  | { type: "ECONOMY" }
  | { type: "DOCUMENTS" }
  | { type: "BENEFITS" }
  | { type: "HOME" };

export interface DashboardAlert {
  id: string;
  tone: AlertTone;
  title: string;
  message: string;
  action: AppAction | null;
  actionLabel: string | null;
}

export interface DashboardSummary {
  greetingName: string;
  accountStatus: AccountStatus;
  primaryUnit: { id: string; ucNumber: string; utility: string; city: string; uf: string } | null;
  unitsCount: number;
  nextInvoice: InvoiceSummary | null;
  energy: {
    compensatedKwhMonth: number;
    consumptionKwhMonth: number;
    /** Not exposed by the API yet (null → the card is hidden). */
    creditBalanceKwh: number | null;
    competencia: Competencia;
  };
  savings: {
    totalSavings: number;
    monthlySavings: number;
    averagePercent: number;
    series: readonly MonthlyValue[];
  };
  alerts: readonly DashboardAlert[];
  unreadNotifications: number;
}

export interface MonthlyValue {
  competencia: Competencia;
  value: number;
}

// ───────────── Invoices & payments ─────────────

export type InvoiceStatus = "PENDENTE" | "ATRASADO" | "PAGO" | "ARQUIVADO" | "SEM_COBRANCA_ACVEL";
export type InvoiceOrigin = "ACVEL" | "DIGITAL_GRID";

export interface InvoiceSummary {
  id: string;
  competencia: Competencia;
  amount: number;
  dueDate: ISODate;
  status: InvoiceStatus;
  ucNumber: string;
  utility: string;
}

export interface InvoiceLineItem {
  kind: "ACVEL" | "CONCESSIONARIA";
  description: string;
  amount: number;
}

export interface InvoiceDetail extends InvoiceSummary {
  holderName: string;
  billingMode: BillingMode;
  origin: InvoiceOrigin;
  items: readonly InvoiceLineItem[];
  utilityAmount: number;
  savings: number;
  compensatedKwh: number | null;
  consumptionKwh: number | null;
  paidAt: ISODateTime | null;
  paymentMethod: PaymentMethod | null;
  pdfAvailable: boolean;
  utilityBill: { amount: number; dueDate: ISODate } | null;
}

export type PaymentMethod = "PIX" | "BOLETO";
/** PROCESSANDO: charge not registered at the bank yet; FALHOU: registration failed/refunded. */
export type ChargeStatus = "AGUARDANDO" | "PROCESSANDO" | "CONFIRMADO" | "EXPIRADO" | "FALHOU";

export interface PixCharge {
  invoiceId: string;
  amount: number;
  emvCode: string;
  /** Null when the gateway does not report an expiry. */
  expiresAt: ISODateTime | null;
  status: ChargeStatus;
}

export interface BoletoCharge {
  invoiceId: string;
  amount: number;
  dueDate: ISODate;
  /** Empty while the charge is still being registered (status PROCESSANDO). */
  digitableLine: string; // 47 digits
  barcode: string; // 44 digits (ITF)
  status: ChargeStatus;
  /** Public https URL of the boleto PDF, when the gateway provides one. */
  pdfUrl: string | null;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  competencia: Competencia;
  amount: number;
  paidAt: ISODateTime | null;
  method: PaymentMethod | null;
}

export interface InvoiceFilters {
  status: "ALL" | "OPEN" | "PAID" | "OVERDUE";
  periodMonths: 3 | 6 | 12;
}

// ───────────── Economy ─────────────

export interface EconomyMonth {
  competencia: Competencia;
  savings: number;
  utilityCost: number; // fatura distribuidora
  acvelCost: number; // fatura ACVEL
  totalWithoutAcvel: number;
  compensatedKwh: number;
  consumptionKwh: number;
}

export interface EconomyOverview {
  totalSavings: number;
  currentMonthSavings: number;
  averagePercent: number;
  compensatedKwhTotal: number;
  startedAt: Competencia;
  months: readonly EconomyMonth[]; // oldest → newest
  indicators: {
    averageConsumptionKwh: number;
    consumptionTrendPercent: number | null;
    savings12Months: number;
    reductionPercent12Months: number;
  };
}

// ───────────── Consumer units ("residências") ─────────────

export type ResidenceType = "CASA" | "APARTAMENTO" | "EMPRESA" | "COMERCIAL" | "INDUSTRIA" | "RURAL" | "OUTRO";
/** Full lifecycle from the business API (consumidores/me/ucs). */
export type ResidenceStatus =
  | "RASCUNHO"
  | "RESIDENCIA_CADASTRADA"
  | "EM_ANALISE"
  | "EM_ANALISE_ADMIN"
  | "APROVADA"
  | "APROVADA_ADMIN"
  | "REPROVADA"
  | "REPROVADA_ADMIN"
  | "CONTRATO_GERADO"
  | "AGUARDANDO_ASSINATURA"
  | "CONTRATO_ASSINADO"
  | "PRONTA_PARA_CONCESSIONARIA"
  | "ENVIADA_CONCESSIONARIA"
  | "APROVADA_CONCESSIONARIA"
  | "REPROVADA_CONCESSIONARIA"
  | "ATIVA_COMPENSANDO"
  | "ATIVA_NAO_COMPENSANDO"
  | "SUSPENSA";

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  uf: string;
}

export interface Residence {
  id: string;
  type: ResidenceType;
  ucNumber: string;
  utility: string;
  /** Utility acronym (sigla) when known — used to pre-select it when editing. */
  utilityCode: string | null;
  holderName: string;
  holderDocument: string;
  address: Address;
  status: ResidenceStatus;
  submittedAt: ISODateTime;
  averageConsumptionKwh: number | null;
  /** Null until the unit exists in the billing system. */
  billingMode: BillingMode | null;
  rejectionReason: string | null;
  contractSigningUrl: string | null;
  /** Operational units imported from billing have no editable registration. */
  editable: boolean;
}

export interface Utility {
  code: string;
  name: string;
  ufs: readonly string[];
}

export interface BillExtraction {
  holderName: string | null;
  holderDocument: string | null;
  ucNumber: string | null;
  utilityCode: string | null;
  cep: string | null;
  street: string | null;
  addressNumber: string | null;
  district: string | null;
  city: string | null;
  uf: string | null;
  tariffClass: string | null;
  averageConsumptionKwh: number | null;
  confidence: "ALTA" | "MEDIA" | "BAIXA";
  /** Fields the user should double-check (low confidence or not read). */
  lowConfidenceFields: readonly string[];
  /** Billing-side record of this extraction, reused when the unit is activated. */
  faturaDistribuidoraId: string | null;
}

export interface LocalFile {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadedDocument {
  documentId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface NewResidenceInput {
  type: ResidenceType;
  ucNumber: string;
  utilityCode: string;
  holderName: string;
  holderDocument: string;
  address: Address;
  /** Null only when editing without replacing the bill. */
  billDocumentId: string | null;
  averageConsumptionKwh: number | null;
  tariffClass: string | null;
  faturaDistribuidoraId: string | null;
}

// ───────────── Notifications ─────────────

export type NotificationCategory = "FATURAS" | "ECONOMIA" | "BENEFICIOS" | "SUPORTE" | "CADASTRO" | "SISTEMA";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: ISODateTime;
  read: boolean;
  action: AppAction | null;
}

// ───────────── Support ─────────────

export type TicketStatus = "ABERTO" | "EM_ATENDIMENTO" | "AGUARDANDO_CLIENTE" | "RESOLVIDO" | "FECHADO";
export type TicketCategory = "FATURA" | "PAGAMENTO" | "ECONOMIA" | "CADASTRO" | "BENEFICIOS" | "OUTROS";

export interface TicketMessage {
  id: string;
  sender: "CLIENTE" | "SUPORTE";
  body: string;
  createdAt: ISODateTime;
  attachments: readonly UploadedDocument[];
}

export interface SupportTicket {
  id: string;
  protocol: string | null;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  lastMessagePreview: string | null;
}

export interface SupportTicketDetail extends SupportTicket {
  messages: readonly TicketMessage[];
}

export interface NewTicketInput {
  category: TicketCategory;
  subject: string;
  message: string;
  attachmentIds: readonly string[];
}

// ───────────── Documents ─────────────

export type DocumentKind = "RG" | "CNH" | "CNPJ" | "CONTA_DE_LUZ" | "CONTRATO" | "OUTRO";
export type DocumentValidation = "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REPROVADO";

export interface AccountDocument {
  id: string;
  kind: DocumentKind;
  name: string;
  status: DocumentValidation;
  rejectionReason: string | null;
  uploadedAt: ISODateTime;
}

// ───────────── Benefits ─────────────

export interface PointsEntry {
  id: string;
  description: string;
  points: number;
  occurredAt: ISODateTime;
  status: "PENDENTE" | "CONFIRMADO";
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsPrice: number;
  category: string;
  available: boolean;
}

export interface BenefitsOverview {
  pointsBalance: number;
  pointsPending: number;
  recentEntries: readonly PointsEntry[];
  rewards: readonly Reward[];
  referral: {
    code: string;
    link: string;
    invited: number;
    active: number;
    pointsEarned: number;
    monthlyLimit: number;
    usedThisMonth: number;
  };
}

// ───────────── Preferences ─────────────

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  marketing: boolean;
}

export type NotificationChannel = keyof NotificationPreferences;

/** Preferences plus which channels the backend can actually persist. */
export interface NotificationSettings {
  values: NotificationPreferences;
  editable: readonly NotificationChannel[];
}

// ───────────── Account deletion ─────────────

export interface AccountDeletionRequest {
  id: string;
  status: "REQUESTED" | "ANONYMIZED" | "CANCELLED";
  requestedAt: ISODateTime;
}
