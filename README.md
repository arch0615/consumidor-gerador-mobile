# ACVEL Consumidor — mobile app

Native consumer app for ACVEL (energia solar por assinatura) built with Expo + React Native. **Integrated with the real ACVEL APIs** (Auth, Business, Rateio) through a typed API client; an in-memory mock data layer remains available for development and QA (`EXPO_PUBLIC_USE_MOCKS=true`). Integration details, endpoint matrix and known API limitations: [docs/api-integration.md](docs/api-integration.md).

Not a WebView wrapper and not a port of the web app: navigation, forms, charts and states were redesigned for phones (see `consumidor-gerador-web/docs/mobile-*.md`).

---

## 1. Installation

Requirements: Node 20+ (tested on 24), npm, and either Expo Go / a development build on a device, an Android emulator or the iOS simulator (macOS).

```bash
cd consumidor-gerador-mobile
npm install
cp .env.example .env      # then fill it in (see below)
npx expo start            # press a (Android), i (iOS) or scan the QR with Expo Go
```

Environment (`.env`, all `EXPO_PUBLIC_*`, embedded in the bundle — no secrets):

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | – | `development` (default) · `preview` · `production` (rejects mocks and non-https URLs) |
| `EXPO_PUBLIC_USE_MOCKS` | – | `true` = mock data layer (dev/QA only). Default `false` |
| `EXPO_PUBLIC_AUTH_API_URL` | API mode | Auth API base URL (consumidor-gerador-api or legacy auth-api), without `/v1` |
| `EXPO_PUBLIC_BUSINESS_API_URL` | API mode | Business API base URL |
| `EXPO_PUBLIC_RATEIO_API_URL` | API mode | Rateio API base URL |
| `EXPO_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_APP_ID` | API mode | Same Firebase project as the web portal |
| `EXPO_PUBLIC_PORTAL_URL` | – | Web portal origin for referral links |
| `EXPO_PUBLIC_API_TIMEOUT_MS` / `EXPO_PUBLIC_CEP_API_URL` | – | Request timeout (20 s) / CEP lookup (BrasilAPI) |

An invalid configuration shows a blocking "Aplicativo indisponível" screen (issues listed in dev builds) — the app never silently falls back to mocks.

Demo login (mock mode): **demo@acvel.com.br / Acvel@123** — the Login screen has a "Preencher" shortcut.

Quality gates (run before every commit):

```bash
npm run typecheck      # strict TypeScript (includes generated typed routes after the first `expo start`)
npm run lint           # expo lint (ESLint 9 + React Compiler rules)
npm test               # jest-expo unit tests (API client, errors, env, contracts)
npm run check          # typecheck + lint + tests
npm run bundle:check   # full Android production bundle (catches Metro/runtime import issues)
npm run doctor         # expo-doctor (SDK/dependency compatibility)
```

Native builds: `npx expo prebuild` / EAS Build. `ios/` and `android/` are generated — never edit them by hand.

### Stack

| Concern | Choice |
|---|---|
| Runtime | Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6 (strict + `noUncheckedIndexedAccess`) |
| Navigation | Expo Router (file-based, typed routes, `Stack.Protected` auth guard) |
| Server state | TanStack Query 5 (retry only transient errors, NetInfo → `onlineManager`, AppState → `focusManager`) |
| Client state | Zustand (session, preferences, dev scenario) |
| Forms | React Hook Form + Zod 4 (shared validators: CPF/CNPJ, CEP, phone, password policy) |
| Secure storage | Expo Secure Store (session token, preferences) |
| UI | Custom ACVEL component library on design tokens (no React Native Paper — see §3) |
| Animation | Reanimated 4 (bottom sheets, skeletons, splash) — all respect Reduce Motion |
| Charts / codes | react-native-svg (custom touch charts, ITF-25 boleto barcode), react-native-qrcode-svg (Pix) |
| Icons | lucide-react-native |

---

## 2. Architecture

```
Screen (src/app/**)  →  Hook (src/features/*/hooks)  →  Service interface (src/services/*.service.ts)  →  remote/*.remote.ts → api/apiClient.ts → ACVEL APIs
                                                                                                       ↘  mock/*.mock.ts → src/mock/* (EXPO_PUBLIC_USE_MOCKS=true)
```

- **Screens** only compose components and call feature hooks. No data, no fetch, no mock imports.
- **Hooks** own TanStack Query keys, caching, optimistic updates and invalidation.
- **Services** are interfaces (`InvoiceService`, `ResidenceService`, …). Each file exports `config.useMocks ? mockX : remoteX`.
- **Remote implementations** (`src/services/remote/*`) call the APIs through `services/api/apiClient.ts` (Bearer Firebase token, 401 refresh-and-retry-once, timeout, error normalisation, Zod-validated responses). Uploads/downloads: `services/api/file-transfer.ts`. Firebase: `services/firebase/` (session in Keychain/Keystore).
- **Mocks** (`src/mock/*`) are plain data modules anchored to the current date (due dates and "há 2 horas" stay realistic). The mock layer simulates latency, errors, uploads with progress, Pix confirmation and identity-from-session.

```
src/
  app/            routes (Expo Router)            components/   design-system components (barrel: @/components)
  features/       per-domain hooks + components   services/     interfaces · remote/ (API) · mock/ · api/ (HTTP client) · firebase/ · push/
  hooks/          cross-cutting hooks             stores/       Zustand stores (auth, preferences, dev scenario)
  theme/          tokens, ThemeProvider           types/        domain types (mirror backend domain model)
  mock/           mock data                       utils/        format (pt-BR), validation, status labels, AppError
  navigation/     routes builder, header options  config/       env validation, static help content
```

**Dev scenario switch** (mock mode + dev builds, Conta → Ferramentas de desenvolvimento): forces every mocked read into `normal`, `empty`, `error`, `slow` or `offline` to review loading, empty, error and offline states on every screen.

---

## 3. Component library

All components read tokens through `useTheme()` (light + dark), have ≥ 48 pt touch targets, cap font scaling at 1.3×, and expose screen-reader labels/roles. React Native Paper was evaluated and not used: its Material look conflicts with the ACVEL brand (flat bordered cards, Montserrat, blue/cyan palette) and would need overriding almost everywhere.

| Group | Components |
|---|---|
| Base | `AppText` (typography variants + tones), `ACVELButton` (primary/secondary/tertiary/destructive/inverse, loading), `IconButton` (badge), `ACVELCard` (default/muted/hero/outlined, pressable), `StatusChip`, `Avatar`, `BrandLogo`, `PageHeader`, `SectionHeader`, `Columns`, `Skeleton` |
| Inputs | `ACVELInput` (label, helper, error, password toggle, multiline), `ACVELSelect` (bottom-sheet list with search), `ACVELCheckbox`, `SegmentedControl`, `CopyField` (clipboard + haptic + announcement) |
| Overlays | `BottomSheet` (animated, keyboard-aware), `ACVELModal` (confirmation, destructive tone) |
| Forms | `FormInput`, `FormSelect`, `FormCheckbox`, `FormSegmented` (RHF-bound), `useFormScroll` + `FormScrollProvider` (scroll to first invalid field), `PasswordChecklist`, `DocumentUploader` (camera/gallery/files, progress, retry), `FileSourceSheet` |
| Cards / lists | `InfoCard` (info/success/warning/danger banners with action), `MetricCard` (KPI + trend), `ListItem`, `SwitchListItem` |
| Charts | `ChartCard`, `AreaChart`, `BarChart` (paired series) — drag to scrub with haptics, adjustable for VoiceOver/TalkBack |
| States | `QueryView` (skeleton → offline → error+retry → empty → content), `LoadingState`, `EmptyState`, `ErrorState`, `OfflineState`, `OfflineBanner` |

---

## 4. Navigation structure

```
Root Stack (Stack.Protected)
├─ onboarding/                 first launch only (!signedIn && !hasSeenIntro)
├─ (auth)/                     signed out: login · forgot-password · register · register-success
└─ signed in
   ├─ (tabs)/                  Início · Faturas · Economia · Benefícios · Conta   (no drawer/sidebar)
   ├─ invoice/                 [id] · [id]/pix · [id]/boleto · payments
   ├─ residence/               index · [id] · new (4-step wizard)
   ├─ support/                 index · [id] (chat) · new
   ├─ account/                 profile · settings · documents · security · delete
   └─ notifications
```

Paths are built only through `src/navigation/routes.ts` (validated by typed routes). Backend-driven actions (`AppAction` on alerts/notifications) map to routes in `hrefForAction`.

---

## 5. Screen list (26 routes)

| Area | Screens | States |
|---|---|---|
| Launch | Native splash + animated brand splash, Onboarding carousel (3 slides) | — |
| Auth | Login (show/hide, validation, loading, errors, session-expired banner, remembered e-mail), Forgot password (+ sent state), Register (masks, live password checklist, terms), Registration success | inline errors, scroll-to-error |
| Home | Greeting + account status + bell badge, savings hero, alerts, next invoice (Pix CTA), energy metrics, 6-month savings chart, quick actions | skeleton, empty (no units), error, offline |
| Invoices | List (status + period filters), Detail (breakdown, energy, PDF, help, pay sheet), Pix (QR, copy-paste, countdown, status polling, confirmed/expired), Boleto (ITF barcode, digitable line, share), Payment history | all four on each |
| Residences | List (cards), Detail (status stepper, contract signing, rejection), New unit wizard: Basic info → Upload bill (camera/file, progress, AI read) → Review (pre-filled, low-confidence hints, CEP lookup) → Confirmation; discard-confirmation on exit | all four |
| Economy | Accumulated savings, metrics, touch charts (savings area / consumption vs. compensated bars, 6/12 m), indicators, monthly history + month breakdown sheet | all four |
| Benefits | Points balance, referral link (copy/share, monthly limit), rewards (redeem with confirmation), points statement | all four |
| Notifications | Grouped (today / 7 days / older), unread dots, category, action navigation, mark one/all as read (optimistic) | all four |
| Support | Tickets, contact channels, FAQ, Ticket chat (bubbles, attachment, composer), New ticket (category, text, attachment) | all four |
| Account | Account hub + sign-out confirmation, Profile (edit name/phone), Settings (theme, notification channels), Documents (status, rejection, upload sheet), Security (change password), Delete account (warning, reason, password, acknowledgement, confirmation dialog) | all four |

---

## 6. Mock data layer

| File | Content |
|---|---|
| `mock/consumer.ts` | Demo profile + credentials, template for new sign-ups |
| `mock/energy-history.ts` | 11 months of consumption/compensation/cost derived from tariff rules (single source for invoices, economy, dashboard) |
| `mock/invoice.ts` | Invoices (2 open — the older overdue once past due — and paid history), Pix/boleto builders, payments |
| `mock/economy.ts` | Economy overview + indicators |
| `mock/dashboard.ts` | Home aggregate composed at request time (+ empty variant) |
| `mock/residence.ts` | 2 units (active / awaiting signature), utilities, CEP directory, AI bill extraction sample |
| `mock/notification.ts` | 7 notifications across categories + channel preferences |
| `mock/support.ts` | 3 tickets with threads, contact channels, FAQ |
| `mock/documents.ts`, `mock/benefits.ts` | Account documents (incl. a rejected one), points/rewards/referral |
| `mock/calendar.ts` | Date anchoring helpers |

Plumbing: `services/mock/mock-request.ts` (`mockQuery`, `mockMutation`, `mockUpload`) applies latency, the dev scenario and deep-copies results. Mutations persist in memory until reload (paying an invoice, sending a message, creating a unit, redeeming points).

---

## 7. Backend integration

See [docs/api-integration.md](docs/api-integration.md) for the endpoint matrix, contract sources, error handling and the list of backend dependencies / known limitations.

## Conventions

- No `any`, no hard-coded colours/sizes in screens (tokens only; the barcode/QR are intentionally black-on-white), no raw enums in UI (use `utils/status-labels.ts`), pt-BR formatting via `utils/format.ts` (America/Sao_Paulo).
- New screen checklist: route in `src/app`, path in `navigation/routes.ts`, data via a feature hook, `QueryView` for loading/empty/error/offline, pull-to-refresh via `useRefreshControl`, forms via `Form*` + `useFormScroll`.
