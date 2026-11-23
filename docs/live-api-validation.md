# Live API validation — ACVEL Consumidor mobile

Status of the move from mock mode to the real ACVEL backends. Updated 2026-10-05 (**corrected scope: portal parity, §14**; **consumer parity audit + new features, §15**; **final client-review readiness, §16**; history of the superseded read-only interpretation in §11–§13).

> **Scope (client, 2026-10-05): Mobile apps provide feature parity with consumer/licenciado production portals. Administrative operations remain only in the ADM module.** User self-service actions of the portals are part of the app; the app never generates invoices, Pix, boletos or other administrative financial records (§14). The earlier "read-only" interpretation (§11–§13, 2026-10-03/04) was incorrect and has been reverted where it removed user features.

| Area | Status |
|---|---|
| Firebase native configuration | ✅ Installed; ids match `com.acvel.app` (§1.1). `teste---00` = **homologation** project, confirmed trusted by `api-acvel.souaiv.com` (§1.2) |
| Environment (`.env`, mocks off) | ✅ Homologation: all three APIs on `https://api-acvel.souaiv.com/api/{auth,business,rateio}` |
| API reachability (3 APIs) | Verified live (health + 401 on protected routes) |
| Contract validation vs. Swagger (Business, Rateio) | Done — 35/35 endpoints exist; mismatches fixed (§4) |
| Authenticated runtime validation (login → all modules) | ✅ Live suite (test-safety: reads only): **40 ok · 0 failed · 1 skipped**, 102 GET requests, 0 write requests (§15.6). Pix/boleto payloads: none exist yet in homologation (backend Sisprime issue, §10.6) |
| Upload validation (PDF / image) | ✅ 1 PDF through the app's upload flow (W3, §9.6). The live suite no longer uploads (read-only) |
| Android build | See §8 (development build; no emulator/device available on this host) |
| typecheck / lint / unit tests / expo-doctor | Pass (75 tests, 1 live suite skipped) / 21 of 21 |

---

## 1. Firebase

### 1.1 Client files (installed 2026-09-30)

| Check | Android `google-services-android.json` | iOS `GoogleService-Info.plist` |
|---|---|---|
| Location | `firebase/google-services-android.json` | `firebase/GoogleService-Info.plist` |
| `app.json` reference | `android.googleServicesFile` ✓ | `ios.googleServicesFile` ✓ |
| Identifier | `package_name` = `com.acvel.app` = `android.package` ✓ | `BUNDLE_ID` = `com.acvel.app` = `ios.bundleIdentifier` ✓ |
| Firebase project | `teste---00` (753725124444) | `teste---00` (753725124444) ✓ same project |
| API key valid / e-mail+password provider enabled | ✓ (`signInWithPassword` with an unknown e-mail → `INVALID_LOGIN_CREDENTIALS`, no user created) | ✓ same check |
| Prebuild | `android/app/google-services.json` generated, `com.google.gms.google-services` plugin applied, `applicationId com.acvel.app` ✓ | not built (macOS required) |

**Project:** `teste---00` is the **homologation** Firebase project; it is trusted by the homologation APIs (`api-acvel.souaiv.com`) and the real consumer account signs in and reaches every module (§1.2, §7.1). Production (`acvel-prod` + `api.appacvel.com.br`) will need its own native files.

**Approach:** native SDK via `@react-native-firebase/app` + `/auth` 26.4.0 (replaces the Firebase JS SDK).

| Item | Implementation |
|---|---|
| Identifiers | `app.json` → `ios.bundleIdentifier` and `android.package` = `com.acvel.app` (was `br.com.acvel.consumidor`) |
| Native files | `ios.googleServicesFile: ./firebase/GoogleService-Info.plist`, `android.googleServicesFile: ./firebase/google-services-android.json` |
| Plugins | `@react-native-firebase/app` (`ios.disableSPM: true` → CocoaPods), `@react-native-firebase/auth`, `expo-build-properties` (`ios.useFrameworks: "static"`) |
| No duplicated config | The `EXPO_PUBLIC_FIREBASE_*` variables were **removed**; the only Firebase config is in the native files. The live test harness reads the Web API key from `google-services-android.json` too. |
| Initialises once | The native layer creates the default app at process start from the files; JS only calls `getApp()` / `getAuth()` (`src/services/firebase/firebase.ts`). |
| Persistence / restart | Native SDK persists the user + refresh token (iOS Keychain, Android app-private storage) and restores it on launch; `restoreSession()` waits for the first `onAuthStateChanged` and validates with `GET /v1/auth/me`. |
| Token refresh | `getIdToken(user, forceRefresh)`; the API client force-refreshes once on 401 and retries. |
| Logout | `signOut(auth)` clears the native session; the query cache is cleared on sign-out. |
| Fail closed | API mode without bundled native config (e.g. Expo Go) shows the "Aplicativo indisponível" screen; no login is attempted. |
| Expo Go | No longer supported for API mode (native module). Use a development build: `npx expo run:android` / `eas build --profile development`. |

**Still to verify on a device** (§8): `npx expo run:android`, sign in, kill the app, reopen (session restored), sign out, reopen (Login shown).

### 1.2 Firebase ↔ backend compatibility (live)

**Environments identified**

| Environment | Firebase project | API host | Evidence |
|---|---|---|---|
| Homologation | `teste---00` (native files in `firebase/`) | `https://api-acvel.souaiv.com/api/{auth,business,rateio}` | `teste---00` token → 401 **"Usuario nao encontrado no sistema"** (token *verified*, user lookup fails); `acvel-prod` token → 401 "Token invalido ou expirado" (rejected) |
| Production | `acvel-prod` (web portal `cliente.appacvel.com.br`) | `https://api.appacvel.com.br/api/{auth,business,rateio}` | `acvel-prod` token → 200 on auth/business/rateio; `teste---00` token → 401 "Token invalido ou expirado" |

The two environments must not be mixed (the first `.env` had Rateio on the production host — corrected to homologation on 2026-10-02).

**Homologation run (2026-10-02), homologation test account**

| Step | Result |
|---|---|
| Firebase sign-in (`teste---00`, REST, native-file API key) | ✅ ID token issued (claims: `aud=teste---00`, provider `password`, `email_verified=false`, 3600 s) — token never logged |
| Wrong password | ✅ rejected (`INVALID_LOGIN_CREDENTIALS`) |
| `Authorization: Bearer <token>` → `GET /v1/auth/me` | ❌ **401 "Usuario nao encontrado no sistema"** — Firebase user exists, but there is no internal user/consumer for it in the homologation auth-api |
| Same token on Business and Rateio | ❌ same 401 (all services resolve the user through the same user base) |

**Backend action required:** provision the homologation test account (Firebase user in `teste---00`; e-mail kept in the git-ignored `.env.test.local`) as an internal **consumer** user in the homologation auth/business databases (with UCs, invoices, documents, tickets if the modules are to be exercised). Nothing in the app can work around this.

**App fix made (mapping layer):** the legacy auth-api signals "user not provisioned" with **401** (the Swagger contract uses 403 `ACCOUNT_NOT_PROVISIONED`). `http-errors.ts` now maps a 401 whose message is "Usuario nao encontrado…" to `ACCOUNT_NOT_PROVISIONED` ("Não encontramos uma conta de cliente para este e-mail."), so login shows the right message instead of "Sua sessão expirou". Unit-tested; confirmed on the live run.

## 2. Environment

`.env` (git-ignored) now contains (homologation):

```
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_AUTH_API_URL=https://api-acvel.souaiv.com/api/auth
EXPO_PUBLIC_BUSINESS_API_URL=https://api-acvel.souaiv.com/api/business
EXPO_PUBLIC_RATEIO_API_URL=https://api-acvel.souaiv.com/api/rateio
EXPO_PUBLIC_PORTAL_URL=https://cliente.appacvel.com.br
```

Production validation (unit-tested in `src/config/__tests__/env.test.ts`): missing API URL → config error; `http://` URL in production → rejected; mocks in production → rejected. Missing Firebase native config → rejected at startup (runtime check).

## 3. Reachability (unauthenticated, 2026-09-30)

| API | Health | Protected route without token | Swagger |
|---|---|---|---|
| Auth `…/api/auth` | `GET /health` 200 (`auth-api`, DB connected) | `GET /v1/auth/me` → 401 `{"message":"Token nao fornecido"}` | none published |
| Business `…/api/business` | 200 (`business-api`) | `GET /v1/consumidores/me` → 401 | `…/api/business/docs-json` (339 operations) |
| Rateio `…/api/rateio` | 200 (`rateio-api`, DB + Redis) | `GET /v1/faturas/me` → 401 | `…/api/rateio/docs-json` (327 operations) |

Errors use the NestJS envelope `{ message, error, statusCode }`, which the client already normalises (401 → session refresh/expiry).

## 4. Contract validation (Swagger vs. app)

All 35 endpoints the app calls exist with the same HTTP method. Differences found and **fixed in services/schemas** (no UI change):

| Module | Finding | Fix |
|---|---|---|
| Invoices | `GET /v1/faturas/me` has no `competencia_inicio` filter (params: `page`, `perPage`/`per_page`, `status`) | Period filter applied client-side |
| Invoices | Detail: compensated energy is `credito_compensado_kwh`; no `pdf_status` (has `pdf_path`) | Schema reads `credito_compensado_kwh` (legacy name kept as fallback) |
| Pix / Boleto | `CobrancaResponseDto`: barcode field is `boleto_codigo`; each charge has `metodo`; several charges per invoice possible | Reads `boleto_codigo`; picks confirmed charge, else newest charge carrying the needed payload (Pix payload / linha digitável) |
| Payments | Confirmed charges expose `metodo` + `confirmado_em` | History built from `GET /v1/pagamentos/cobrancas?status=CONFIRMADO` (snapshot as fallback) |
| Documents | Upload `tipo` enum has no `CONTRATO` (has `CONTRATO_ASSINADO`, `CONTRATO_SOCIAL`, `CPF`, `PROCURACAO`, `TERMO_ADESAO`) | Mapping corrected |
| Profile | `UpdateConsumidorDto` has no `whatsapp` (web portal sends it and swallows the error) | Only `nome_completo` + `celular`; a 403 on this secondary sync is tolerated (auth profile is canonical) |
| Benefits | `GET /v1/pontos/me` declares `page` | Sent |
| Auth | Live auth-api is the legacy service (not consumidor-gerador-api); its `/auth/me` may use `id`, nested `user`, snake_case | `/auth/me` normalised to the canonical shape (same variants as the web mapper); unit-tested |

Confirmed as matching: `CreateSolicitacaoUCDto` / `EditarSolicitacaoUCDto` (all fields sent exist; `documento_fatura_id` required on create), `PresignUploadDto`, `ConfirmUploadDto`, `UpdatePreferenciaDto`, `CreateSupportTicketDto`, `CreatePedidoDto` (+ required `idempotency-key` header), `FaturaOcrResultadoDto` (all extracted fields read by the app exist).

Endpoints **without a response schema in Swagger** (shape still from the web client, validated at runtime by Zod): rateio-snapshot, concessionárias, documentos list, signed-url, notificações (list/count/preferências), support tickets/messages, WhatsApp config, pedidos context, pontos, indicação, produtos, faturas/me, minhas-ucs. These are exactly what `npm run test:live` records (field names only) in `.live-report.json`.

## 5. Backend gaps

1. **Auth API has no Swagger** — contract taken from consumidor-gerador-api + web mapper.
2. **Support attachments**: `SendSupportMessageDto.attachments` is an untyped `object[]`, ticket creation has no attachments and there is no support upload endpoint → attachment UI stays hidden in API mode.
3. **Notification preferences**: only `email_enabled`, `push_enabled`, `in_app_enabled`, `categorias` — WhatsApp/SMS not persistable.
4. **Push**: no device-registration endpoint.
5. **Credit balance (kWh)**: not exposed.
6. **Bill upload format**: the OCR endpoint accepts "PDF ou imagem"; whether `FATURA_ENERGIA` documents accept images is not documented (web allows PDF only) → to be confirmed by the upload run.
7. Many list endpoints lack response schemas (§4).
8. Legacy auth-api: "user not provisioned" is a 401 (not 403); `GET`/`DELETE /v1/auth/account/delete-request` do not exist (no status lookup / cancel of a deletion request).
9. Real-account run (§7.1 "Backend gaps found in this run"): support READ permission missing for consumers; Digital Grid invoice detail/PDF 404/403; `onboarding_completed` inconsistent; `total_sem_acvel` = 0; invoice `PAGA` / charge `PENDENTE` mismatch; `paga_em` null in `faturas/me`.

## 6. Remaining work

Done: native Firebase files installed (§1.1), `.env.test.local` configured (git-ignored), read-only live validation with a real account (§7.1), mapping fixes M1–M4 and the paid-invoice payment gate (§7.1), Android debug build (§8). M5 (converting a pending charge to confirmed) is **not** applied by decision.

1. **Backend:** fix the gaps in §7.1 and §9.8 — above all `suporte` permissions for the `consumidor_basico` role (the homologation test user only works through the temporary role of §9.4) and the invoice `PAGA` / charge `PENDENTE` mismatch.
2. **Test data** (homologation account) to evaluate the skipped checks:
   - an **open invoice** (PENDENTE/ATRASADO) with a registered **Pix** charge (EMV payload + expiry) and a **boleto** charge (linha digitável) → Pix, Pix status poll, Boleto;
   - ~~at least one document~~ — done (W3, §9.6);
   - ~~a support ticket with messages~~ — done (W2, §9.5);
   - optional: notifications, points/statement entries and an active product → non-empty Notifications/Benefits.
3. **Pix / boleto display:** after the backend fixes the Sisprime `nosso_numero` sequence, the ACVEL systems must (re)generate the charge of an open invoice; the app then only reads it (`npm run test:live` shows the QR / digitable line state). The app itself never generates or retries a charge (§11).
4. **Device validation** of the Android build (no emulator/device on this host); iOS build requires macOS/EAS.

## 7. Live results

### 7.1 Real consumer account — `npm run test:live` (read-only), 2026-10-02

Environment: Firebase `teste---00` + `api-acvel.souaiv.com` (auth, business, rateio). Account: real consumer with data (credentials only in the git-ignored `.env.test.local`). **No writes** (no units, uploads, tickets, redemptions). Aggregate checks were complemented with a read-only diagnostic that prints only counts/enums.

Initial run (before the fixes): **21 ok · 1 failed · 5 not evaluated**. The table below records that run; M1–M4 tags point to the fixes and the "Before / after" table shows the final state (**27 ok · 1 failed · 5 not evaluated**).

| # | Module | Endpoint(s) | HTTP | Schema | Result / data |
|---|---|---|---|---|---|
| 1 | Firebase login | `identitytoolkit … signInWithPassword` | 200 | — | ✅ ID token issued (never logged); wrong password → `INVALID_LOGIN_CREDENTIALS` ✅ |
| 2 | Auth | `GET /v1/auth/me` | 200 | ✅ legacy shape accepted by normaliser | `CONSUMIDOR`, `ACTIVE`, role `consumidor_basico`, 17 permissions, `onboarding_completed=false`, no `consumerId`. 401 → refresh → retry ✅ |
| 3 | Profile | `/v1/auth/me` + `GET /v1/consumidores/me`; `GET /v1/auth/account/delete-request` | 200; 404 | ✅ | FISICA, document/phone/referral set, billing `UNIFICADA`. Delete-request lookup route missing (404 → "no open request") |
| 4 | Dashboard | me, `rateio-snapshot`, `consumidores/me/ucs`, `ucs/minhas-ucs`, `concessionarias`, `notificacoes/nao-lidas/count`, `documentos` | 200 | ✅ | 1 unit ATIVO, no next invoice, 6-month savings series, total savings > 0, energy month 2026-08. ⚠️ shows an **onboarding alert** although the consumer is `APROVADO`, `compensando=true`, `dg_status=VINCULADO` (mapping issue M1) |
| 5 | Units | `/v1/consumidores/me/ucs` + snapshot + `/v1/ucs/minhas-ucs`; `/v1/concessionarias` | 200 | ✅ | 1 unit `ATIVA_COMPENSANDO`, editable; detail ✅; 104 utilities; creation allowed |
| 6 | Invoice list | `GET /v1/faturas/me` | 200 | ✅ (`data[]` + `meta{total,page,perPage,totalPages}`) | 22 invoices: 19 `PAGA` (`origem_portal=ACVEL`), 3 `SEM_COBRANCA_ACVEL` (Digital Grid). App shows 10 in the 12-month window (`PAGO`, `SEM_COBRANCA_ACVEL`). `paga_em` is null on all paid invoices; `boleto_linha`/`pix_code` present in the list but not mapped |
| 7 | Invoice details | `GET /v1/faturas/{id}` | 200 (ACVEL) / **404** (Digital Grid) | ✅ | The harness opened the newest invoice (Digital Grid) → 404 "Fatura … nao encontrada" → app falls back to the snapshot (0 items, kWh only, `pdfAvailable=false`). ACVEL invoices return 200. PDF: `GET {rateio}/v1/faturas/{id}/pdf` → **200 application/pdf** for ACVEL; Digital Grid `/v1/faturas-distribuidora/{id}/download` → **403 "Permissao negada: READ em fatura_distribuidora"** (mapping issue M3) |
| 8 | PIX | `GET /v1/pagamentos/cobrancas?fatura_id=` | 200 (paid ACVEL) / 404 (Digital Grid) | ✅ | ⏭ Pix payload not evaluated: no open invoice. Paid ACVEL invoices have 1 `BOLETO` charge still `PENDENTE` (backend mismatch, see below); Digital Grid invoices have no charge → 404 (M2). Unfiltered `cobrancas?status=CONFIRMADO` → 0 records |
| 9 | Boleto | same charge endpoint | 200 (paid ACVEL) / 404 (Digital Grid) | ✅ | ⏭ boleto payload not evaluated (same reason) |
| — | Payment history | `cobrancas?status=CONFIRMADO` + snapshot | 200 | ✅ | 0 confirmed charges → 19 payments from the snapshot fallback, no payment method |
| 10 | Economy | snapshot `summary.por_competencia` | 200 | ✅ | 12 months from 2025-09, trend +8.48 %. ⚠️ **average saving % = 0**: for the 11 ACVEL months `total_sem_acvel` and `total_com_acvel` are **0** (not null), so the app's fallback (`??`) never applies and every month is excluded (M4) |
| 11 | Documents | `GET /v1/documentos?proprietario_tipo=CONSUMIDOR&consumidor_id=…` | 200 | ✅ | 0 documents; signed URL ⏭ not evaluated |
| 12 | Notifications | `GET /v1/notificacoes`, `nao-lidas/count`, `preferencias` | 200 | ✅ | 0 notifications, 0 unread; preferences editable (push, email, marketing), `categorias {}` |
| 13 | Support | `GET /v1/client-configuracoes/whatsapp-atendimento`; `GET /v1/support/tickets` | 200; **403** | ✅; — | WhatsApp `phoneE164=null` (button hidden). ❌ Tickets: **403 "Permissao negada: READ em suporte"**, also with `clientId` filter → the consumer role has no support permission |
| 14 | Benefits | `pedidos/me/context`, `pontos/me`, indicação, `GET /v1/produtos` | 200 | ✅ | Balance 0, 0 statement entries, 0 rewards (`produtos` empty even unfiltered), referral code set. `pedidos/me/context` returns numbers as strings (handled) |
| — | Uploads | — | — | — | ⏭ read-only run |

**Mapping fixes (service layer only) — applied 2026-10-02**

| Id | Issue | Fix |
|---|---|---|
| M1 | `/auth/me` returns `onboarding_completed=false` for an approved, compensating consumer → dashboard shows "complete your registration" | `isConsumerOnboarded` (business.ts): effective state = backend flag **or** consumer `status=APROVADO` / `aprovado_em` set / `compensando=true` (web portal splash + hydrate rule). Used by dashboard, profile and the session identity (`auth.remote` `validatedIdentity`). The backend value is not changed |
| M2 | Charge lookup throws on 404 (`cobrancas?fatura_id`) | `listCharges` (invoice.remote.ts): 404 → no charge; other errors still surface. Pix/Boleto screens show their existing non-error state ("Estamos gerando sua cobrança"); paid invoices are gated ("Fatura já paga", see below) |
| M3 | Detail fallback marks `pdfAvailable=false` even when the snapshot has `pdf_url=/v1/faturas/{id}/pdf` | `hasAcvelInvoicePdf`: PDF exposed for ACVEL invoices whose `pdf_url` is `/v1/faturas/{id}/pdf` (the path `downloadPdf` calls); `toDetail` hides it for Digital Grid origin. Digital Grid PDFs stay hidden while the backend answers 403 |
| M4 | `total_sem_acvel = 0` treated as a real value → average % = 0 (also affects dashboard %) | `baselineWithoutAcvel`: engine value when > 0, otherwise the existing approximation distribuidora + ACVEL + economia. Used by economy and dashboard. Note: the web portal uses `!= null` and is therefore also skewed by the engine's 0 (backend gap 4) |

**Before / after (same account, read-only)**

| Check | Before | After |
|---|---|---|
| `GET /v1/auth/me` | 200, `onboarding_completed=false` | 200, unchanged (backend value kept) |
| Effective onboarding (profile / session) | false | **true** (consumer APROVADO + compensando) |
| Dashboard alerts | `onboarding` ("Finalize seu cadastro") | **none** |
| Dashboard average saving % | 0 (engine 0 baselines summed) | **8.4 %** |
| Invoice list | 10 in 12 months (PAGO, SEM_COBRANCA_ACVEL) | unchanged |
| Invoice detail — Digital Grid (`/faturas/{id}` 404) | snapshot fallback, `pdfAvailable=false` | unchanged (PDF hidden: backend 403) |
| Invoice detail — paid ACVEL (`/faturas/{id}` 200) | not exercised by the harness | origin ACVEL, PAGO, kWh 3260/1688, paid date set, **`pdfAvailable=true`** |
| ACVEL PDF `GET {rateio}/v1/faturas/{id}/pdf` | not exercised | **200 application/pdf** (body starts with `%PDF`) |
| Missing charge (Digital Grid invoice, `cobrancas?fatura_id` 404) | `RESOURCE_NOT_FOUND` error | **no error** → Pix/Boleto "PROCESSANDO", empty payload (existing non-error state) |
| Economy average saving % | 0 | **8.63 %** (12-month reduction 8.41 %, trend +8.48 %) |
| Live totals | 21 ok · 1 failed · 5 skipped | **27 ok · 1 failed · 5 skipped** (6 checks added: paid-invoice detail, ACVEL PDF, 2 × paid invoice via deep link, 2 × missing charge) |

**Backend mismatch: paid invoice with a pending charge (M5 — not applied by decision)**

| Source | Value |
|---|---|
| `GET /v1/faturas/{id}` / `faturas/me` | invoice `status = PAGA` |
| `GET /v1/pagamentos/cobrancas?fatura_id={id}` | 1 charge, `metodo = BOLETO`, `status = PENDENTE` (no digitable line) |

Seen on every paid ACVEL invoice sampled. This is a backend data inconsistency: the charge is not settled when the invoice is paid. **The app does not convert `PENDENTE` to `CONFIRMADO`** — inventing payment state in the frontend is not allowed. The charge keeps the app's usual mapping (`PENDENTE` → awaiting; without a payload → `PROCESSANDO`).

App handling (presentation only, charge status untouched):

1. Payment actions stay hidden for paid invoices (invoice detail shows Pix/Boleto only for `PENDENTE`/`ATRASADO`) — unchanged.
2. Pix/Boleto screens reached through a deep link for an invoice whose status is `PAGO` show a neutral **"Fatura já paga"** state (no QR code, no digitable line, no share, no polling; only "Ver fatura"). The decision is `paymentScreenGate` (`src/features/invoices/payment-gate.ts`) using the new `invoiceStatus` field of `PixCharge`/`BoletoCharge`. A Pix confirmed while the screen is open still shows the payment-confirmed flow.
3. Related cleanup: when an invoice has **no** charge, the app no longer reports `CONFIRMADO` derived from the invoice status (it reports `PROCESSANDO`); the paid case is covered by the gate.
4. Unit-tested (`live-mapping.test.ts`, deep-link suite) and verified live: paid ACVEL invoice → `invoice=PAGO charge=PROCESSANDO (backend status kept) gate=ALREADY_PAID` for both Pix and Boleto.

**Backend action:** settle (`CONFIRMADO`, with `confirmado_em` and method) the charge when the invoice is marked `PAGA`, or cancel the superseded charge.

Not changed: an invoice `SEM_COBRANCA_ACVEL` opened via deep link still shows the "Estamos gerando…" state (no charge exists and no payment action is reachable from the UI).

**Skipped live checks (final run)**

| Check | Reason |
|---|---|
| Pix charge (+ status poll) | no open invoice on the account |
| Boleto charge | no open invoice on the account |
| Documents — signed URL | account has no documents |
| Support — ticket + messages | ticket list is 403 for the consumer role (harness reports "no tickets") |
| Uploads (PDF / PNG) | read-only run (`--writes` not approved) |

Only failure: Support — tickets, **403 "Permissao negada: READ em suporte"** (backend permission).

**Backend gaps found in this run**

1. Support: consumer role lacks `READ suporte` → ticket list 403 (ticket creation not tested).
2. `/v1/faturas-distribuidora/{id}/download` → 403 "READ em fatura_distribuidora" for the consumer; `/v1/faturas/{id}` → 404 for Digital Grid invoices.
3. `/auth/me.onboarding_completed` inconsistent with the consumer's approved status.
4. Snapshot `total_sem_acvel`/`total_com_acvel` = 0 on ACVEL months (billing engine values not populated).
5. **Invoice `PAGA` / charge `PENDENTE` mismatch** on paid ACVEL invoices (see "Backend mismatch" above); `faturas/me` also returns `paga_em=null` → payment history has no method; payment date only via the invoice detail.
6. No open invoice / charge on the account → Pix and boleto cannot be validated (needs an open invoice with Pix + boleto).
7. `GET`/`DELETE /v1/auth/account/delete-request` missing (§7.3).
8. Empty data: documents, notifications, products (rewards catalogue), tickets; WhatsApp support phone not configured.

### 7.2 Earlier homologation run (unprovisioned account), 2026-10-02

Environment: Firebase `teste---00` + `api-acvel.souaiv.com` (auth, business, rateio). No writes were performed (no units, uploads, tickets or redemptions).

| # | Module | Check (app service → endpoint) | Result |
|---|---|---|---|
| 1 | Auth | Firebase login | ✅ |
| 2 | Auth | Firebase ID token | ✅ issued, attached as `Authorization: Bearer` by the app's API client |
| 3 | Auth | `GET /v1/auth/me` | ❌ 401 → `ACCOUNT_NOT_PROVISIONED` |
| 3b | Auth | 401 → forced token refresh → retry once | ✅ behaviour executed (refresh + single retry); retry still 401 for the reason above |
| 4 | Profile | `getProfile` (`/v1/auth/me` + `/v1/consumidores/me`) | ❌ 401 |
| 5 | Dashboard | `getSummary` (me, rateio-snapshot, ucs, minhas-ucs, concessionárias, nao-lidas/count, documentos) | ❌ 401 |
| 6 | Units | `list` (`/v1/consumidores/me/ucs` + snapshot + `/v1/ucs/minhas-ucs`) | ❌ 401 |
| 6b | Units | `listUtilities` (`GET /v1/concessionarias`) | ✅ 104 utilities (public endpoint; shape matches `{ sigla, nome }`) |
| 6c | Units | creation availability (`/v1/consumidores/me`) | ❌ 401 |
| 7 | Invoices | `list` (`GET /v1/faturas/me`) | ❌ 401 |
| 8 | Invoice details | `GET /v1/faturas/{id}` | ⏭ not evaluated (no invoice id — list failed) |
| 9 | PIX | `GET /v1/pagamentos/cobrancas?fatura_id=` | ⏭ not evaluated (no invoice) |
| 10 | Boleto | same charge endpoint | ⏭ not evaluated (no invoice) |
| — | Payments | `GET /v1/pagamentos/cobrancas?status=CONFIRMADO` + snapshot | ❌ 401 |
| 11 | Economy | snapshot `summary.por_competencia` | ❌ 401 |
| 12 | Documents | `GET /v1/documentos` (list) | ❌ 401; signed URL ⏭ not evaluated |
| 13 | Notifications | list / `nao-lidas/count` / `preferencias` | ❌ 401 (3 checks) |
| 14 | Support | WhatsApp config / tickets | ❌ 401 (2 checks); ticket messages ⏭ not evaluated |
| 15 | Benefits | wallet context / pontos / indicação / produtos | ❌ 401 |

Totals: 4 ok · 16 failed (all the same root cause: account not provisioned) · 7 not evaluated (dependent data unavailable, or writes disabled). **No response shapes of authenticated endpoints could be captured yet** — the Zod/Swagger mapping work of §4 remains validated statically only.

### 7.3 Auth route inventory on the homologation auth-api (unauthenticated probe)

| Route used by the app | Exists? | Note |
|---|---|---|
| `GET /v1/auth/me` | ✅ | |
| `POST /v1/auth/register` | ✅ | pt-BR validation messages |
| `PATCH /v1/users/me` | ✅ | (also `GET /v1/users/me`) |
| `PUT /v1/auth/profile` | ✅ | legacy |
| `PATCH /v1/auth/change-password` | ✅ | |
| `POST /v1/auth/account/delete-request` | ✅ | |
| `GET /v1/auth/account/delete-request` | ❌ 404 | app treats 404 as "no open request" → cancel option is simply not shown |
| `DELETE /v1/auth/account/delete-request` | ❌ 404 | cancelling a deletion request is not possible on this backend |

### 7.4 Earlier production probe (2026-09-30)

The first test account authenticates only in `acvel-prod`; with an `acvel-prod` token, `api.appacvel.com.br` answered 200 on auth/business/rateio (`/auth/me` shape: `userId, onboarding_completed, role, roleSlug, permissions, territory, uid, email, …` — accepted by the app's normaliser). Production was not validated further (out of scope for the homologation phase).

Harness notes (test code only): native Firebase modules are stubbed and a Node `https` fetch is installed in the live suite, because jest-expo replaces `fetch` with Expo's native implementation.

## 8. Android build

| Item | Result |
|---|---|
| Command | `npx expo prebuild --platform android --clean` → `gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a` |
| Result | ✅ **BUILD SUCCESSFUL** (25 m 43 s, first build) — `app-debug.apk`, 85.8 MB |
| APK | package `com.acvel.app`, versionName 1.0.0, compile/target SDK 36, native code `arm64-v8a` |
| Firebase in APK | `google-services` plugin applied; resources `project_id=teste---00`, `google_app_id=1:753725124444:android:…` (from `firebase/google-services-android.json`) |
| Windows build note | The project path contains spaces (and is long); NDK/CMake fails to start `prefab_command.bat` from it (`react-native-screens`, `react-native-worklets` configureCMake). Building from a space-free path works — used a disposable copy at `C:\acvel-build\m`. Recommended: keep the repo in a short path without spaces for Android builds. |
| Device / emulator validation | **Not performed** — this host has no hardware virtualization (emulator unavailable) and no device attached. Firebase startup, login, restart persistence, logout, API calls and navigation on a device are **untested**. With the current `teste---00` files the real consumer account signs in and the APIs answer (§7.1). |
| iOS | Not built (requires macOS / EAS). |

## 9. Admin panel — homologation test preparation (2026-10-02)

Admin panel `https://admin-test.appacvel.com.br` (admin credentials only in the git-ignored `.env.test.local`).

### 9.1 Environment isolation

| Check | Result |
|---|---|
| Admin panel Firebase project | `teste---00` (homologation) — from the panel's own bundle |
| Admin panel API | same-origin proxy (`/api/...`); probes and any preparation are done **directly on the homologation API** `api-acvel.souaiv.com` |
| Admin token on homologation `/v1/auth/me` | 200 — `ADMIN`, role `ADMIN_MACRO`, 197 permissions |
| Same token on production `api.appacvel.com.br/v1/auth/me` | **401** "Token invalido ou expirado" → production cannot be reached with these credentials |

### 9.2 Consumer test account (read-only)

| Item | Result |
|---|---|
| Account | exists, `ACTIVE`; consumer `APROVADO`, `aprovado_em` set, `compensando=true`, `dg_status=VINCULADO`; linked to a licenciado |
| Role / permissions | `consumidor_basico` (shared **system** role, **95 users** in homologation), 17 permissions: `marketplace`, `consumidor`, `solicitacao_uc`, `onboarding`, `documento` (CREATE/READ OWN), `fatura` (READ OWN), `pagamento` (CREATE/READ OWN), `pontos` (READ OWN). **No `suporte` permission** → cause of the 403 |
| Invoices | 19, all `PAGA`, `origem_calculo=DIGITAL_GRID_HISTORICO` (historical import); no open invoice |
| Charges | 19, all `BOLETO` / `PENDENTE`, no digitable line / Pix payload — historical import, explains the PAGA/PENDENTE mismatch (§7.1) |
| Homologation as a whole | 1 195 invoices; 23 `PENDENTE`, all historical imports whose charges are `BOLETO`/`PENDENTE` without payload; **no Pix charge exists in homologation** |
| Documents / tickets / points / products | 0 / 0 (whole homologation) / 0 / 0 (whole homologation) |
| Notification config | email/push/in-app flags only; no admin endpoint to create notifications |
| Payment gateway environment | **not determinable** from the admin API (no sandbox/production flag exposed; integrations list only an e-mail service `api.mail.acvel.local` and a disabled webhook) |

### 9.3 Licenciados (read-only)

No licenciado test credentials were provided; homologation has 3 licenciados, all `APROVADO`, onboarding `APROVADO` (all 5 steps complete).

| Licenciado (id prefix) | User / role | Clients | Commissions | Licenciado payments | Team (sublicenciados) | Documents |
|---|---|---|---|---|---|---|
| `1cca73dc` (test-like e-mail) | `LICENCIADO`, `licenciado_master` (+ consumidor) | 2 (APROVADO) | 0 | 3 (2 PAGO, 1 PROCESSANDO) | 0 | contrato, CNH, RG — APROVADO |
| `470da74f` (linked to the consumer test account) | `LICENCIADO`, `licenciado_master` (+ consumidor, gerador) | 87 (APROVADO) | 0 | 0 | 0 | CNH, RG — APROVADO (no signed contract) |
| `c187713d` | user is `ADMIN`-type (admin + op_rateio + consumidor roles) | 1 | 0 | 1 (PENDENTE) | 0 | contrato, CNH, RG — APROVADO |

Homologation-wide: **0 commissions**, 4 licenciado payments, 0 sublicenciados, 0 pending onboardings, 0 QR codes.

### 9.4 Admin-side changes log (homologation only)

| # | Date | Change | Record ids | Scope | Rollback |
|---|---|---|---|---|---|
| W1 | 2026-10-02 | Created role **`consumidor_teste_suporte`** ("Consumidor teste suporte (HML)", `tipo_usuario=CONSUMIDOR`) via `POST /v1/roles` (auth-api, same calls as the admin panel's *Segurança › Perfis*) | role `b502c195-d5d2-4fa0-a7cc-ff0dac658bd6` | — | `DELETE /v1/roles/b502c195-d5d2-4fa0-a7cc-ff0dac658bd6` (after removing the assignment) |
| W1 | 2026-10-02 | Added 19 permissions to that role (`POST /v1/roles/{id}/permissions`): **new grants only `suporte:READ:OWN` and `suporte:CREATE:OWN`**; the other 17 are copies of `consumidor_basico` (marketplace, consumidor, solicitacao_uc, onboarding, documento, fatura, pagamento, pontos — same scopes) so the user keeps its permissions whichever role the API treats as primary | — | role above | removed with the role |
| W1 | 2026-10-02 | Assigned the role to the consumer test user (`POST /v1/users/{id}/roles`) | user `49902298-b382-480e-9dd5-297494a079d5` | **1 user** | `DELETE /v1/users/49902298-b382-480e-9dd5-297494a079d5/roles/b502c195-d5d2-4fa0-a7cc-ff0dac658bd6` |
| W2 | 2026-10-02 | As the consumer, through the app's `supportService.create`: **1 ticket** "[HML] Teste app mobile" (category Outros → `CADASTRO_DOCUMENTOS`) with **1 message** (initial message) | ticket `35ff4e06-01ad-4843-97a7-157e7d92f08e` | 1 ticket, 1 message | No delete endpoint for tickets. Close with `PATCH /v1/support/tickets/35ff4e06-01ad-4843-97a7-157e7d92f08e/status {"status":"RESOLVIDO"}` (support/admin), or ask the backend team to delete the row |
| W3 | 2026-10-02 | As the consumer, through the app's `uploadConsumerDocument` (presign → PUT → confirm): **1 PDF** `hml-teste-app-mobile.pdf`, type `OUTRO`, description "[HML] Teste de integração do app mobile (homologação) — pode ser removido." | document `3ee73f0c-bfbb-4d42-9fca-191a0c63657f` | 1 document | No delete endpoint for documents. Mark it rejected with `POST /v1/documentos/3ee73f0c-bfbb-4d42-9fca-191a0c63657f/reprovar` (admin), or ask the backend team to delete the row + stored file |

Verified after W1: `consumidor_basico` unchanged (17 permissions before and after); the test user's roles are `consumidor_basico` + `consumidor_teste_suporte`; its `/v1/auth/me` now includes `suporte READ:OWN, CREATE:OWN`. Not done: W4 (blocked), W5 (skipped), PNG upload.

Order of a full rollback: (1) resolve/remove the ticket, (2) reject/remove the document, (3) remove the role assignment, (4) delete the role.

### 9.5 Support validation (after W1 + W2)

| Check | Endpoint | Result |
|---|---|---|
| Ticket list | `GET /v1/support/tickets` | 200 — 1 ticket (only the consumer's own: `clientId` = its consumer id) |
| Ticket detail | `GET /v1/support/tickets/{id}` | 200 — subject "[HML] Teste app mobile", category → Cadastro, status `AGUARDANDO` |
| Messages | `GET /v1/support/tickets/{id}/messages` | 200 — 1 message, `sender=USER` → shown as the client, text matches, send time shown |
| Scope | — | consumer sees only its own ticket. Cross-account isolation cannot be demonstrated: homologation has no other tickets |

Real response shapes (first seen now that the 403 is gone) and **mapping fixes** (service layer):

| Finding | Fix |
|---|---|
| List envelope is `{ items, total, page, pageSize }` → the app rejected it (`INVALID_RESPONSE`) | `zList` accepts `{ items: [...] }` besides `[...]` and `{ data: [...] }` (unit-tested) |
| Message time is `sentAt` (camelCase) → would render as 1970 | `sentAt` read first (then `sent_at`, `created_at`) |
| List preview is `lastMessagePreview` (camelCase) → ignored | read first |
| Backend status `AGUARDANDO` (enum: `AGUARDANDO`, `EM_ATENDIMENTO`, `RESOLVIDO`) | **not changed**: app shows "Aguardando cliente", the same mapping as the web portal. A new ticket the client just opened therefore reads "Aguardando cliente" — semantics to be confirmed by the backend team (§9.8) |
| Protocol | not provided by the API (`protocol=null`) |

Ticket reply (`POST …/messages`) was not exercised: it would create a second message, which was not approved.

### 9.6 Document upload validation (W3)

| Step | Result |
|---|---|
| Presign `POST /v1/documentos/presign-upload` | ✅ |
| Upload (PUT to the presigned target) | ✅ (under Jest the native byte transfer is replaced by an equivalent Node PUT; presign/confirm/schemas are the app's code) |
| Confirm `POST /v1/documentos/confirm-upload` | ✅ → document `3ee73f0c-bfbb-4d42-9fca-191a0c63657f` |
| Document list | ✅ 1 document, kind `OUTRO`, name `hml-teste-app-mobile.pdf` |
| Status mapping | ✅ `status_validacao` → `PENDENTE` (awaiting review) |
| Signed URL | 200 `{ document_id, signed_url, expires_at }` — `signed_url` is **API-relative** (`/v1/documentos/{id}/content…`) and **requires the Bearer token** (401 without, 200 `application/pdf` with) |
| Open flow | ❌ before: the app expected an absolute https URL (`INVALID_RESPONSE`) and opens documents in the in-app browser, which cannot send the token. **Fixed:** `openableDocumentUrl` returns a public https URL unchanged, or downloads the API-relative path with the session into the cache; `useOpenDocument` opens local files through the share sheet (same pattern as the invoice PDF). ✅ live: downloaded file starts with `%PDF` |

### 9.7 Live run after W1–W3

`npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ 53 passed (1 live suite skipped) · `npm run test:live` (read-only) **31 ok · 0 failed · 3 skipped**.

| Skipped | Reason |
|---|---|
| Pix charge (+ status poll) | no open invoice — W4 blocked |
| Boleto charge | no open invoice — W4 blocked |
| Uploads (PDF + PNG, `--writes`) | not run; the single approved PDF was uploaded with `--write-document-pdf` |

The one-off W2/W3 harness switches were **removed** on 2026-10-03: the live suite is read-only (§11.5); the ticket and document created then are only read.

### 9.8 Remaining backend gaps (admin preparation)

1. **Support permission:** `consumidor_basico` has no `suporte` permission; production consumers will get 403. The homologation test user works only through the temporary role `consumidor_teste_suporte`.
2. **Admin cannot see consumer tickets:** the admin's `GET /v1/support/tickets` returns 0 although the consumer's ticket exists (admin view scoped to own tickets / different endpoint?).
3. `GET /v1/support/tickets/{unknown id}` answers **200 with an empty body** instead of 404.
4. Ticket status `AGUARDANDO` is ambiguous (waiting for support vs. for the client); no "open" status.
5. Document signed URL is API-relative and authenticated (not a public signed URL) — handled in the app; to be confirmed as the intended contract.
6. No delete endpoints for documents or tickets (rollback requires backend help).
7. ~~W4 blocked~~ — client confirmed the sandbox; see §10 for the result (Sisprime registration rejected: `nosso_numero` collision).
8. Earlier gaps still open: invoice `PAGA` / charge `PENDENTE`, Digital Grid detail/PDF 404/403, `onboarding_completed`, `total_sem_acvel = 0`, deletion-request routes, WhatsApp phone, empty products/points/notifications (§7.1).

## 10. W4 — Pix / boleto payment flow (homologation, 2026-10-02) — backend investigation history

> Kept as backend investigation history. The invoice/charge calls below were made with separate admin scripts (not app code) and are **outside the mobile app scope** (§11). The app has no invoice, Pix, boleto or charge creation code.

**Approval:** W4 approved by the client for homologation only, after confirming that homologation uses sandbox/test payment APIs and that the Sisprime homologation environment does not generate real payable Pix.

Environment (unchanged): Firebase `teste---00`; APIs `https://api-acvel.souaiv.com/api/{auth,business,rateio}`. Every write script refuses to run against any other host.

### 10.1 Step 1 — test account

| Check | Result |
|---|---|
| Firebase sign-in (`teste---00`) | ✅ |
| `GET /v1/auth/me` | ✅ 200, CONSUMIDOR, ACTIVE (support permissions from §9.4) |
| Consumer | `APROVADO`, `compensando=true`, billing `UNIFICADA` |
| Unit | 1 UC (`a3a03b38…`), `ATIVA`, group B, `modo_cobranca=UNIFICADA`; 0 open invoices before W4 |

### 10.2 Step 2 — payment test data

How the backend issues payments (web portal `invoices.api.ts` + Swagger): Pix and boleto are **one Sisprime hybrid boleto** per invoice (digitable line + Pix EMV in the same charge), registered when the invoice is issued. The minimal path is therefore **one invoice** via `POST /v1/faturas/cobranca-avulsa` (creates a real `FaturaConsumidor` for an existing active UC and registers the Sisprime boleto synchronously; 409 if the UC already has an invoice for that competência).

| # | Call | Result |
|---|---|---|
| 1 | `POST /v1/faturas/cobranca-avulsa` (100 kWh, TE 0.27575, TUSD 0.36667, the UC's configured discount; header `x-audit-reason: [HML] W4 …`) | 400 — UNIFICADA UCs require `valor_distribuidora_real`. **Nothing created** |
| 2 | same + `valor_distribuidora_real: 80` | **201** — invoice created; `aviso`: "boleto não pôde ser registrado agora; será reprocessado em até 1 h ou via POST /v1/pagamentos/cobrancas" |
| 3 | `POST /v1/pagamentos/cobrancas {fatura_id, tipo_pagamento: "BOLETO"}` (the retry named by the backend; no e-mail/phone sent) | **500** — same Sisprime record re-sent (attempt 2), same rejection. No new record |
| 4 | `POST /v1/pagamentos/cobrancas {fatura_id, tipo_pagamento: "PIX"}` (second method, same invoice) | **500** — goes through the same Sisprime registration (attempt 3), same rejection. No new record. **Attempts stopped here** |

**Sisprime sandbox answer:** `Entrada Rejeitada: O campo [Nosso Número] não pode se repetir.` — the backend generated `nosso_numero = 00000000001` (`numero_documento 0000000001`); the sandbox has already used that number, i.e. the homologation sequence restarted at 1 and collides with numbers previously registered in the Sisprime sandbox. Every retry reuses the same number, so no Pix payload or digitable line can be produced until the backend fixes the sequence.

**Records created (homologation test data):**

| Record | Id | State | Reverse / disable |
|---|---|---|---|
| Invoice (`FaturaConsumidor`, origin `COBRANCA_MANUAL_AVULSA`), competência **2025-06** (a gap in the historical data — does not block a future billing cycle), due **2026-10-16**, **R$ 135,89**, `pdf_status=PREVIEW` | `9b4f3366-7b70-4566-a7da-d46017dc3837` | `PENDENTE` | `POST /v1/faturas/9b4f3366-7b70-4566-a7da-d46017dc3837/cancelar` with header `x-audit-reason` (cancels the invoice and requests the Sisprime write-off when a boleto was registered). Created with audit reason "[HML] W4 validacao fluxo Pix/boleto app mobile - dado de teste de homologacao" |
| Charge (Sisprime record exposed by `GET /v1/pagamentos/cobrancas?fatura_id`; its id equals the invoice id; `GET /v1/pagamentos/cobrancas/{id}` → 404) | `9b4f3366-7b70-4566-a7da-d46017dc3837` | `BOLETO` / `FALHOU`, `erro` = Nosso Número rejection | cancelled with the invoice (`DELETE /v1/pagamentos/cobrancas/{id}` also exists but answers 404 for this synthetic id) |
| Sisprime boleto record | `38994668-89d6-4aa3-becb-50e87ce789f9` | `status_registro=ERRO`, 3 attempts, never registered at the bank | removed/written off with the invoice cancellation |

No Pix charge id and no separate boleto charge id exist: Pix and boleto are the same (unregistered) Sisprime record. The backend's automatic reprocessing (≤ 1 h) will keep retrying the same number until the sequence is fixed.

### 10.3 Step 3 — Pix (app service layer, live)

| Check | Result |
|---|---|
| Endpoint | `GET /v1/pagamentos/cobrancas?fatura_id={id}` → **200**, `{ data: [charge], meta }` |
| Response schema | ✅ accepted. Real field set: `id, fatura_id, metodo, valor, status, gateway, gateway_payment_id, pix_qr_code, pix_qr_code_base64, pix_txid, pix_expira_em, boleto_codigo, boleto_linha_digitavel, boleto_url_pdf, boleto_expira_em, confirmado_em, created_at, erro` |
| QR / payload field | `pix_qr_code` (EMV) — the app reads it first ✅; **null** here (registration failed) |
| Expiry field | `pix_expira_em` — **null** for the Sisprime hybrid; `boleto_expira_em` = due date. App shows no countdown when null (the web portal falls back to `boleto_expira_em`; not changed) |
| Initial status | `FALHOU` → app `FALHOU` → **"Cobrança indisponível"** (retry + support), no payment action |
| Polling | `getChargeStatus` → `FALHOU` → polling **stops** |
| Expired behaviour | not producible live; unit-tested with the real field set (`EXPIRADO` kept) |
| Missing Pix | Digital Grid invoice: charge lookup 404 → no charge, no error (M2) ✅ |
| Confirmation | **none invented**: `CONFIRMADO` only when the backend says so (unit-tested) |
| Successful hybrid payload | not obtainable live (sandbox rejection); unit-tested with the real field set: `pix_qr_code` → QR + copia-e-cola, status `PENDENTE` → `AGUARDANDO` |

### 10.4 Step 4 — Boleto (live)

| Check | Result |
|---|---|
| Generation | ❌ rejected by the Sisprime sandbox (`nosso_numero` collision) — **no banking registration** happened |
| Digitable line / barcode | `boleto_linha_digitavel` / `boleto_codigo`: **null** |
| Due date | ✅ 2026-10-16 (from the invoice) |
| Charge status | `FALHOU` → **"Boleto indisponível"** (retry + support) |
| Copy / share | not reachable (no line) — shown only when a digitable line exists; unit-tested mapping of line (47 digits) + barcode (44 digits) from the same hybrid charge |
| Boleto PDF | `boleto_url_pdf` null; invoice PDF `GET /v1/faturas/{id}/pdf` → **409** "PDF oficial ainda não está disponível … Sisprime ainda não confirmou o boleto como REGISTRADO" → app hides "Baixar PDF" (`pdf_status=PREVIEW`) ✅ |

### 10.5 Step 5 — mobile flow (service + screen-state logic)

| Screen | State | Verified |
|---|---|---|
| Dashboard | "próxima fatura" = the test invoice (PENDENTE, due 2026-10-16) | live |
| Invoice list | open invoice listed (after fix below) | live: 11 invoices incl. `PENDENTE` |
| Invoice detail | PENDENTE, payable (Pix/Boleto actions shown), PDF hidden (PREVIEW) | live |
| Pix | failed charge → "Cobrança indisponível"; polling stops; paid-invoice guard → "Fatura já paga"; no-charge → "Estamos gerando…" | live (states derived from the live service results) |
| Pix QR / copy / countdown | needs a registered charge | unit-tested only |
| Boleto | failed charge → "Boleto indisponível"; paid guard → "Fatura já paga" | live |
| Boleto line / copy / share | needs a registered charge | unit-tested only |

Rendering on a device was **not** performed (no emulator/device on this host); the screen states above follow from the live service results and the screens' existing branching.

**Mobile fix (incorrect state handling):** the invoice list applied the period filter (3/6/12 months by competência) to every invoice, so an open invoice with an older competência (here 2025-06) was missing from *Faturas* although the dashboard showed it as the next invoice. `inPeriod` now always keeps `PENDENTE`/`ATRASADO` invoices; the period filter applies to history only (unit-tested). No other mapping changes were needed: the real charge schema matched the app's `cobrancaSchema`.

### 10.6 Backend issues found in W4

1. **Sisprime `nosso_numero` collision (blocker):** homologation generates `00000000001`, already used in the Sisprime sandbox → every registration rejected; Pix and boleto cannot be tested until the sequence is fixed (or the sandbox reset).
2. `POST /v1/pagamentos/cobrancas` answers **500 Internal server error** on a rejected registration (should be 4xx/502 with the gateway message).
3. The charge exposed for a Sisprime record uses the **invoice id** as its id; `GET /v1/pagamentos/cobrancas/{id}` → 404 for it.
4. `pix_expira_em` is null for the hybrid boleto (only `boleto_expira_em`).
5. **Homologation database outage during the final run (≈15:13 UTC):** Postgres "not yet accepting connections / in recovery mode"; auth-api health `degraded`. The auth-api answered **401 with the Prisma error text** for a database failure — clients treat 401 as an expired session (the app would sign the user out), and the message leaks internals. Should be 503 without details.

### 10.7 Step 7 — final checks (after the database recovered, ≈15:17 UTC)

`npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ 57 passed (1 live suite skipped) · `npm run test:live` (read-only) **35 ok · 0 failed · 1 skipped** (PDF+PNG `--writes`, not approved).

Post-run state: the consumer has exactly **1** open invoice (the W4 test invoice) with **1** charge record (`FALHOU`); no further payment records were created after the validation.

## 11. Read-only billing scope (2026-10-03) — partially superseded by §14

> Still valid: no invoice / Pix / boleto / charge generation, read-only billing service, neutral "ainda não disponível" states. **Reverted (2026-10-05):** the removal of the bill OCR (§11.2) — it is a user feature of the portal's unit registration.

**The mobile Consumidor app is a read-only client for billing data. Invoice, Pix and boleto generation are outside the mobile app scope.** The app consults the existing backend/database and displays the information already generated by the ACVEL systems. It never generates invoices, boleto charges, Pix charges, payment records or financial records, and it calls no Rateio write endpoint.

### 11.1 Rateio endpoints used by the app — all read-only

| Endpoint | Method | Used for | Read-only |
|---|---|---|---|
| `/v1/faturas/me` | GET | invoice list | ✅ |
| `/v1/faturas/{id}` | GET | invoice detail / status | ✅ |
| `/v1/faturas/{id}/pdf` | GET (authenticated download) | existing official invoice PDF | ✅ |
| `/v1/pagamentos/cobrancas?fatura_id={id}` | GET | existing Pix / boleto of an invoice; status polling on the Pix screen | ✅ |
| `/v1/pagamentos/cobrancas?status=CONFIRMADO` | GET | payment history | ✅ |
| `/v1/ucs/minhas-ucs` | GET | billing mode of the units | ✅ |

Enforced by `src/services/__tests__/billing-read-only.test.ts` (fails on any `api.post/put/patch/delete("rateio", …)`, any Rateio upload, any Rateio path outside this list, or any `createInvoice / generatePix / generateBoleto / createCharge` name).

Business-API reads used for billing data: `GET /v1/consumidores/me/rateio-snapshot` (fallback list, savings, payment history). Non-billing account features (profile, documents, support tickets, notification preferences, unit registration, rewards) keep their Business/Auth calls; none of them creates billing or payment records.

### 11.2 Write endpoints removed

| Endpoint | Where | Change |
|---|---|---|
| `POST rateio /v1/fatura-ocr/processar` (bill OCR — stores the extraction, consumes AI tokens) | add-unit wizard ("Lendo sua conta…") | **removed**: `ResidenceService.extractBill`, `useBillExtraction`, the OCR schema, the multipart upload helper, the `BillExtraction` type and the mock sample. Unit registration continues with manual entry + the bill upload (Business documents) |
| Invoice / charge creation (`POST /v1/faturas/cobranca-avulsa`, `POST /v1/pagamentos/cobrancas`, Sisprime registration) | — | never present in the app code; used only by the W4 admin scripts (§10), not kept |
| Mock "Pix generation" + simulated payment (in-memory charge creation, auto-confirmation after 20 s, "Modo demonstração" card) | `services/mock/invoice.mock.ts`, Pix screen | **removed**: the mock now only reads its static demo charges and never confirms a payment |
| Live-suite writes (`--writes`, `--write-support`, `--write-document-pdf`, upload code) | `live-api.test.ts`, `run-live-tests.mjs` | **removed**; any write flag is rejected and any non-GET request to the ACVEL APIs is blocked and reported |

### 11.3 Read-only service interface

`InvoiceService`: `getInvoices()`, `getInvoice()`, `downloadInvoicePdf()`, `getExistingPix()`, `getExistingBoleto()`, `getPaymentStatus()`, `getPaymentHistory()` (was `list / get / downloadPdf / getPixCharge / getBoleto / getChargeStatus / listPayments`). Each reads what the backend returns; none requests, retries or registers a charge.

### 11.4 UI changes

| Screen | Before | After |
|---|---|---|
| Pix — no Pix / not registered / registration failed | "Estamos gerando sua cobrança" / "Cobrança indisponível — não foi possível gerar…" | **"Pix ainda não disponível"** — "O código Pix desta fatura ainda não está disponível. Consulte novamente mais tarde ou fale com o suporte." Actions: *Atualizar* (re-reads) · *Falar com o suporte* |
| Pix — expired | "Atualizar código" ("para obter um código válido") | *Atualizar* — re-reads whether a code is available; *Pagar com boleto* opens the existing boleto |
| Pix — mock mode | "Modo demonstração: pagamento confirmado automaticamente" | removed |
| Boleto — no boleto / not registered / failed | "Estamos gerando seu boleto" / "Boleto indisponível — não foi possível registrar…" | **"Boleto ainda não disponível"** (same pattern, *Atualizar* re-reads) |
| Add unit — bill step | automatic reading of the bill (OCR) + "confira este campo" hints | upload only; fields filled manually (CEP lookup still fills the address) |
| Unchanged | "Pagar fatura" / "Pagar com Pix" / "Boleto" only open the **existing** payment information; "Fatura já paga" gate; PDF download of the existing invoice | — |

Kept compatibility fixes: onboarding mapping (M1), missing charge = no charge (M2), invoice PDF mapping (M3), economy baseline (M4), paid-invoice deep-link gate, open invoices always listed, support/document mapping fixes (§9).

### 11.5 Checks (2026-10-03)

`npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ 60 passed (1 live suite skipped; new `billing-read-only.test.ts`) · `npm run test:live` **36 ok · 0 failed · 0 skipped — 88 GET, 0 write requests** · `npm run test:live -- --writes` → refused ("The live suite is read-only").

Live (read-only) states: open test invoice → Pix "Pix ainda não disponível", Boleto "Boleto ainda não disponível" (backend charge `FALHOU`, status kept, polling stops); paid invoices → "Fatura já paga"; Digital Grid invoice → no charge, no error.

### 11.6 Remaining backend dependencies

1. Pix / boleto content exists only when the ACVEL systems generate and register the charge — currently blocked in homologation by the Sisprime `nosso_numero` collision (§10.6). The open W4 test invoice `9b4f3366-…` remains for that retest (or can be cancelled, §10.2).
2. Invoice `PAGA` / charge `PENDENTE` mismatch on historical invoices (gated in the app, §7.1).
3. Bill OCR is no longer available in the app; if auto-fill is wanted again it needs a read-only (non-persisting) endpoint or must happen outside the app.
4. Other gaps unchanged (§9.8, §10.6).

## 12. Read-only marketplace (2026-10-03) — superseded by §14

> **Reverted (2026-10-05):** reward redemption is a user feature of the consumer portal (`/marketplace/[itemId]`), so it was restored for parity. Admin marketplace operations stay excluded.

**Decision (client):** reward redemption is disabled in the mobile app. `POST /v1/pedidos` creates a new marketplace/business record, and the mobile apps consult and expose existing backend data rather than generate business records. The marketplace is **read-only** in the app.

### 12.1 Allowed (kept) — all GET

| Endpoint (business) | Used for |
|---|---|
| `/v1/pedidos/me/context` | wallet / points balance |
| `/v1/pontos/me` | points statement |
| `/v1/produtos` | rewards catalogue (items stay visible) |
| `/v1/consumidores/me/indicacao` | referral code, link and counters |

Existing order/redemption history: not shown in the app today (the API's `GET /v1/pedidos` is a filtered listing; adding a read-only "Meus resgates" view would be a separate, read-only change if wanted).

### 12.2 Removed / disabled

| Item | Change |
|---|---|
| `POST business /v1/pedidos` (create order / redeem, Idempotency-Key) | **removed** from `remoteBenefitsService` |
| `BenefitsService.redeem()` | **removed** — the interface now has only `getOverview()` (read) |
| `useRedeemReward` hook | **removed** |
| Mock `redeem` (subtracted points, added a statement entry) | **removed** — the mock serves static demo data and never changes the balance |
| Benefits screen: tap on an affordable reward → "Trocar por …? / Confirmar troca" modal, "Resgate solicitado!" / "Não foi possível trocar" cards, "Toque para trocar" hint | **removed**. Rewards remain listed with points price, category and the "Esgotado" / "Pontos insuficientes" chips, but are no longer pressable |

### 12.3 UI wording

- Rewards section subtitle: **"Resgates disponíveis no portal do cliente ACVEL."** — matches the existing client flow (the customer web portal has the marketplace with redemption: `/marketplace`, `/marketplace/resgates`). Plain text only: no link or redirect was added.
- Page subtitle: "Acumule pontos e troque por recompensas" → "Seus pontos, recompensas e indicações".

### 12.4 Guards and checks

- Static test `billing-read-only.test.ts` now also fails on any Business write to `/v1/pedidos|marketplace|carteira|pontos|produtos` and on names such as `redeem*`, `createOrder`, `placeOrder`, `createPedido`, `cancelRedemption`, `useRedeem*`; and asserts that `BenefitsService` exposes only `getOverview`.
- Live suite: every non-GET request to the ACVEL APIs (Auth, Business, Rateio) is blocked; an explicit check reports "no marketplace order / redemption (POST /v1/pedidos)".
- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ 62 passed (1 live suite skipped) · `npm run test:live` **37 ok · 0 failed · 0 skipped — 88 GET, 0 write requests**.

### 12.5 Kept for a separate product-scope review (status: §13)

User workflow actions that are not financial/business generation remain unchanged: profile update, document upload, support ticket/message, notification preferences (and mark-as-read), unit registration/onboarding, password change, account-deletion request. Their write calls are Auth/Business only; none touches Rateio or the marketplace.

## 13. Self-service write actions — scope status (2026-10-04) — superseded by §14

> The "Pending product-scope confirmation" freeze below is **lifted**: the client confirmed these are user-facing portal features and stay in the app (§14).

Fixed scope (approved): **Rateio read-only · Marketplace read-only · no invoice, Pix or boleto generation · no marketplace order creation.** No further feature removals until the client clarifies the remaining self-service actions; no refactor was made for this section (code unchanged).

| Workflow | Write calls (API) | Status |
|---|---|---|
| Profile update | `PATCH auth /v1/users/me`; `PATCH business /v1/consumidores/{id}` (name/phone sync) | **Pending product-scope confirmation** — frozen: unchanged in the code, no new work |
| Registration (sign-up) | `POST auth /v1/auth/register` | **Pending product-scope confirmation** — frozen |
| Document upload | `POST business /v1/documentos/presign-upload` → upload → `POST business /v1/documentos/confirm-upload` | **Pending product-scope confirmation** — frozen |
| Unit registration / correction | `POST business /v1/consumidores/me/ucs`; `PATCH business /v1/consumidores/me/ucs/{id}` (bill upload via documents) | **Pending product-scope confirmation** — frozen |
| Password / security | `PATCH auth /v1/auth/change-password` (+ Firebase re-authentication / password reset) | Kept |
| Account deletion | `POST auth /v1/auth/account/delete-request` (`DELETE` cancel — route missing on the legacy auth-api, §7.3) | Kept |
| Notification state / preferences | `PATCH business /v1/notificacoes/{id}/ler`; `POST business /v1/notificacoes/ler-todas`; `PUT business /v1/notificacoes/preferencias` | Kept |
| Support communication | `POST business /v1/support/tickets`; `POST business /v1/support/tickets/{id}/messages` | Kept |

"Frozen" means: the workflows stay as they are today (no removal, no extension) until the client decides whether the Consumidor app may perform them or should redirect them to another channel. The live suite remains read-only for all of them (§11.5, §12.4).

## 14. Corrected scope — feature parity with the production portals (2026-10-05)

**Rule (client): "Mobile apps provide feature parity with consumer/licenciado production portals. Administrative operations remain only in the ADM module."**

- In scope: every user-facing function of `https://cliente.appacvel.com.br` (Consumidor app) and `https://licenciado.appacvel.com.br` (Licenciado app).
- Out of scope: ADM-module operations (internal operators: approvals, role/permission management, admin configuration, invoice/charge generation, Sisprime registration, payment confirmation, marketplace approval/stock).
- Still never done by the app: invoice, boleto or Pix generation; administrative financial creation.

### 14.1 Review of the earlier removals

| Removed under the incorrect "read-only" reading | Portal evidence | Action (2026-10-05) |
|---|---|---|
| Bill OCR in the add-unit wizard (`POST rateio /v1/fatura-ocr/processar`, auto-fill + "confira este campo" hints) | portal `services/fatura-analise` → `/v1/fatura-ocr/processar` in the unit registration | **Restored** exactly from the last commit (service, hook, wizard steps, mock, `BillExtraction` type, multipart helper) |
| Reward redemption (`POST business /v1/pedidos`, reward tap → "Confirmar troca", success/error cards, mock debit) | portal `/marketplace/[itemId]` → `POST /v1/pedidos` | **Restored** exactly from the last commit (portal parity requires it) |
| Pix/Boleto "Estamos gerando…" wording → "Pix / Boleto ainda não disponível" | the app only displays existing charges | **Kept** (accurate: the app does not generate charges) |
| Mock auto-confirmation of Pix + "Modo demonstração" card | demo-only behaviour, not a portal feature | **Kept removed** (mock reads static demo data) |
| Live-suite write switches | test tooling, not an app feature | **Kept removed**: the live suite stays read-only as a *test-safety* rule (it must not create data in the shared environment); app write actions are covered by unit tests |
| Freeze of profile update, registration, document upload, unit registration/correction (§13) | portal `/perfil`, `/auth/cadastro`, documents, `/minhas-residencias/nova` + `/editar` | **Lifted** — never removed from the code; they stay |

Guard test replaced: `billing-read-only.test.ts` → **`app-scope.test.ts`** — allows portal user actions (bill OCR, own redemption) and fails on any invoice/charge/Pix/boleto generation call (`/v1/faturas*`, `/pagamentos`, `/cobrancas`, `/sisprime`, `/fechamento`), any ADM-only endpoint (`/admin*`, roles/permissions, approve/reject/suspend/status), any marketplace write other than the user's own `POST /v1/pedidos`, and keeps the billing service read-only.

### 14.2 Consumidor — feature coverage vs. `cliente.appacvel.com.br`

Reference: the consumer portal source (`consumidor-gerador-web`, same public routes as production) and its menu: Início · Histórico de Faturas · Minhas Faturas (residências) · Economia/BI · Pontos/Marketplace · Indicação · Perfil/Suporte · Minhas Usinas (generator capability).

| Portal feature (route) | Mobile | Status |
|---|---|---|
| Login, cadastro, recuperar senha, splash (`/auth/*`) | login, register (+ success), forgot-password, session restore | ✅ |
| Redefinir senha (`/auth/redefinir-senha`, e-mail link) | reset e-mail is sent by Firebase; the link opens the web page | ⚠️ partial (no in-app reset form) |
| Onboarding (`/onboarding`) | `/onboarding` | ✅ |
| Início (`/inicio`) | dashboard tab | ✅ |
| Faturas list + detail + PDF (`/faturas`, `/faturas/[id]`) | invoices tab, invoice detail, PDF | ✅ |
| Pagamento Pix / boleto (`/pagamentos/pix`, `/pagamentos/boleto`) | invoice Pix / boleto screens (display existing charge) | ✅ |
| Histórico de pagamentos | invoice payments | ✅ |
| Minhas residências: list, nova (with bill OCR), editar (`/minhas-residencias*`) | residence list, new (wizard, OCR restored), detail + correction | ✅ |
| Economia (`/economia`) | economy tab | ✅ |
| **BI** — "indicadores avançados de consumo, economia e energia compensada" (`/bi`) | — | ❌ gap |
| Pontos: saldo + extrato (`/pontos`, `/pontos/extrato`) | benefits tab: balance + recent entries | ⚠️ partial (no full paginated statement) |
| Marketplace: catálogo + resgatar (`/marketplace`, `/marketplace/[itemId]`) | benefits tab: rewards + redeem (restored) | ⚠️ partial (no item detail page) |
| **Meus resgates** + cancelar resgate (`/marketplace/resgates`, `POST /v1/pedidos/{id}/cancel`) | — | ❌ gap |
| Indicação: link/código, regras, meus indicados (`/indicacao*`) | benefits tab: link, share, counters | ⚠️ partial (no rules page, no list of referred users) |
| Landing de indicação (`/indicacao/[code]`) | — (web landing; app sign-up has no referral-code field) | ⚠️ check with client |
| Notificações (`/notificacoes`) + preferências (`/perfil/preferencias`) | notifications, settings | ✅ |
| Perfil (`/perfil`) + segurança (`/perfil/seguranca`) | profile, security, documents, account deletion | ✅ |
| **"Quero ser gerador"** — request generator access (card on `/perfil`, `POST business /v1/gerador-interest-requests`, `GET …/me`) | — | ❌ gap (endpoint exists in homologation) |
| **Minhas usinas** — plant list, nova (onboarding with geocoding), detalhe (`/minhas-usinas*`, only with generator capability; `/v1/geradores/me/*`) | — | ❌ gap |
| Suporte: lista, novo, conversa (`/suporte*`) | support list, new, ticket | ✅ |
| Termos de uso e privacidade | links in the account tab | ✅ |
| Página de manutenção (`/manutencao`) | — | ⚠️ check whether the app needs a maintenance state |

### 14.3 Licenciado — coverage vs. `licenciado.appacvel.com.br`

There is **no Licenciado mobile app in this repository** (workspace: `consumidor-gerador-api`, `consumidor-gerador-web` — the consumer portal — and `consumidor-gerador-mobile` — the Consumidor app). Parity for the Licenciado portal therefore cannot be validated here.

What the production portal's public bundles show (no login): authentication + cadastro + recover; licenciado onboarding steps (dados pessoais, dados profissionais, documentos, dados bancários, termos, submit); code generation; client data (rateio snapshot); statement and payment receipts (extrato, comprovante); training lessons; messages; documents (signed URL, reenviar); approve/reject actions (to be classified: user-facing for the licenciado's team vs. ADM). A full inventory needs the Licenciado portal source code or a licenciado test account (none provided — §9.3).

### 14.4 Still excluded (ADM only)

Invoice generation (`/faturas/gerar`, `/faturas/cobranca-avulsa`), charge creation/cancel/retry (`/pagamentos/cobrancas`), Sisprime registration/reconciliation, payment confirmation, invoice status changes; marketplace approval/rejection/stock (`/pedidos/{id}/approve|reject|status`, `/produtos` writes); generator-request administration (`/admin/gerador-interest-requests/*`); roles/permissions/users administration; admin configuration.

### 14.5 Proposed next steps (not started — need go-ahead)

1. Consumidor gaps, by size: "Quero ser gerador" request (small), Meus resgates + cancel (small), full points statement / item detail / referral rules + list (small–medium), BI indicators (medium), Minhas usinas + plant onboarding for generator users (large).
2. Licenciado app: provide the Licenciado portal source or a homologation licenciado account to inventory the portal; then plan the Licenciado mobile app (separate project).

### 14.6 Checks (2026-10-05)

`npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ 62 passed (1 live suite skipped) · `npm run test:live` **36 ok · 0 failed · 0 skipped — 88 GET, 0 write requests** (test-safety rule; restored write features are covered by unit tests, not exercised live).

## 15. Consumer portal parity audit and implementation (2026-10-05)

Reference: consumer portal `https://cliente.appacvel.com.br` (source `consumidor-gerador-web`; menu: Início · Histórico de Faturas · Minhas Faturas · Economia/BI · Pontos/Marketplace · Indicação · Perfil/Suporte · Minhas Usinas). Rules kept: no invoice / Pix / boleto / charge generation; no ADM operations (`app-scope.test.ts`).

### 15.1 Parity matrix

Status: ✅ parity · ⚠️ partial · ❌ missing. Priority: P1–P3 as requested; — = nothing left to do.

| Feature | Portal | Mobile status | Missing | Priority |
|---|---|---|---|---|
| Dashboard | `/inicio` | ✅ summary, next invoice, alerts, savings, energy | — | — |
| Profile | `/perfil` | ✅ view + edit name/phone | — | — |
| Security | `/perfil/seguranca` | ✅ change password; reset e-mail | in-app form for the e-mail reset link (`/auth/redefinir-senha`, web page) | P3 |
| Documents | perfil/onboarding documents | ✅ list, upload (PDF/image), open (authenticated download → share sheet) | — | — |
| Units | `/minhas-residencias`, `/nova`, `/[id]/editar` | ✅ list, detail, registration wizard with **bill upload + OCR** (restored), correction | — | — |
| Generator request ("Quero ser gerador") | card on `/perfil` → `POST /v1/gerador-interest-requests` | ✅ **new** (§15.2) | — | P1 ✔ |
| Invoices | `/faturas`, `/faturas/[id]` | ✅ list (open invoices always listed), detail, official PDF | — | — |
| Payment information | invoice detail / payment history | ✅ payment history, paid date/method when provided | — | — |
| Pix / Boleto consultation | `/pagamentos/pix`, `/pagamentos/boleto` | ✅ display of the **existing** charge (QR / copia-e-cola, linha digitável, barcode, share), status polling, "ainda não disponível", "Fatura já paga" gate | content depends on the backend generating the charge (§10.6) | — |
| Economy | `/economia` | ✅ accumulated savings, monthly chart, indicators, monthly comparison | — | — |
| BI | `/bi` (KPIs + mini charts) | ✅ **extended** (§15.2): the BI KPIs are on the economy tab; added *Custo* chart (distribuidora + ACVEL per month) and savings trend vs. previous month | — | P3 ✔ |
| Points | `/pontos`, `/pontos/extrato` | ✅ balance + **full paginated statement** (new) | — | P2 ✔ |
| Marketplace | `/marketplace`, `/marketplace/[itemId]` | ✅ catalogue + **item detail page** (new) | category / points-range filters and sorting of the portal catalogue | P3 |
| Reward redemption | `POST /v1/pedidos` on the item page | ✅ restored; now on the item detail (as in the portal), reserves points until approval | — | — |
| Redemption history | `/marketplace/resgates` + cancel | ✅ **"Meus resgates"** (new): list, status, cancel while `PENDENTE` (`POST /v1/pedidos/{id}/cancel` with `expected_version`) | — | P2 ✔ |
| Referral program | `/indicacao`, `/regras`, `/meus-indicados` | ✅ link, share, counters + **rules page and referred list** (new) | — | P3 ✔ |
| Referral landing | `/indicacao/[code]` (public web page) | ⚠️ web only; the app sign-up has no referral-code field | referral code in app sign-up (needs product decision) | P3 |
| Notifications | `/notificacoes`, `/perfil/preferencias` | ✅ list, read / read-all, preferences | — | — |
| Support | `/suporte`, `/novo`, `/[ticketId]` | ✅ list, new ticket, conversation | — | — |
| Legal pages | `/termos-de-uso-e-privacidade` | ✅ links in the account tab | — | — |
| Account deletion | perfil | ✅ deletion request (cancel route missing on the legacy auth-api, §7.3) | — | — |
| Minhas usinas (generator area) | `/minhas-usinas*` (generator capability only) | ❌ not implemented | plant list/detail, plant onboarding (geocoding, documents, submit), performance, revenue, payments, alerts, regulatory content — ~30 portal services | P3 (large) |
| Maintenance page | `/manutencao` | ⚠️ none | app maintenance state (if the client wants one) | P3 |

### 15.2 Implemented in this round (Screen → Hook → Service → API client)

| Feature | Screens | Hooks | Service (remote / mock) | API |
|---|---|---|---|---|
| Quero ser gerador | `app/account/generator.tsx` (benefits, rules, my requests, optional message, confirmation); entry in the Conta tab | `useGeneratorAccess`, `useRequestGeneratorAccess` | `generator.service.ts` → `remote/generator.remote.ts` / `mock/generator.mock.ts` | `GET /v1/gerador-interest-requests/me`, `POST /v1/gerador-interest-requests` (`source: PROFILE`, `message` ≤ 1000), generator flag from `/auth/me` / `/consumidores/me` (`is_generator`) |
| Points statement | `app/benefits/statement.tsx` (paged, "Carregar mais") | `usePointsStatement` (infinite query) | `benefitsService.getPointsStatement(page)` | `GET /v1/pontos/me?page&perPage=50` |
| Meus resgates | `app/benefits/redemptions.tsx` (status, cancel with confirmation) | `useRedemptions`, `useCancelRedemption` | `getRedemptions`, `cancelRedemption` | `GET /v1/pedidos`, `POST /v1/pedidos/{id}/cancel` (`motivo`, `expected_version`, Idempotency-Key) |
| Reward detail + redemption | `app/benefits/reward/[id].tsx`; rewards on the Benefícios tab open it | `useReward`, `useRedeemReward` | `getReward`, `redeem` | `GET /v1/produtos/{id}`, `GET /v1/pedidos/me/context`, `POST /v1/pedidos` |
| Referral rules + referred | `app/benefits/referral.tsx` | `useReferralProgram` | `getReferralProgram` | `GET /v1/consumidores/me/indicacao`, `GET /v1/consumidores/me/indicados` |
| BI additions | economy tab: *Custo* chart view, "Neste mês" trend vs. previous month | — | existing economy data | rateio snapshot |

Also: new routes (`routes.generator / reward / redemptions / pointsStatement / referral`), `app/benefits/_layout.tsx`, status presentations (`GENERATOR_REQUEST_STATUS`, `REDEMPTION_STATUS`, `REFERRAL_STATUS`), domain types, query keys (redemption/cancel invalidate every benefits query). The mock now reserves points on redemption and releases them on cancel (same behaviour as the backend).

### 15.3 API contracts and assumptions

- Swagger (homologation) confirms every endpoint above; ADM variants (`/v1/admin/gerador-interest-requests/*`, `/v1/pedidos/{id}/approve|reject|status`) are excluded.
- Live shapes (read-only, consumer account): `/v1/consumidores/me/indicacao` → `codigo, link, totalIndicados, indicadosAtivos, totalCliques, limiteMensal, indicadosNoMes, pontosGanhos, recompensaPorIndicacao, programaAtivo, mensagemConvite`; `/v1/pontos/me` → `{ summary: { currentBalance, referralPointsEarned }, data, meta: { page, perPage, totalPages } }`; `/v1/pedidos` → `{ data, meta: { total, page, per_page, total_pages } }`; `/v1/gerador-interest-requests/me` → array; `/v1/consumidores/me/indicados` → array.
- **Assumptions (list items not observable — the test account has no requests, orders or referrals):** order items follow the portal mapper (`produto_id, produto.nome, pontos_gastos | pontos_solicitados, status, created_at, version`); referred people follow the portal mapper (`id, nome, status, createdAt, rewardPoints`, names masked by the API); generator requests use `id, status, created_at, message` with statuses matched by meaning (open / contacted / granted / closed). Parsers are tolerant; unit tests cover these shapes. To be confirmed when such data exists.
- `GET /v1/pedidos` is assumed to be scoped to the authenticated consumer (the portal uses it as "Meus resgates").
- `programaAtivo` is `false` in homologation (`INDICACAO.REFERRAL_ENABLED=false`); the portal does not gate on it, so the app does not either.

### 15.4 Remaining gaps

1. **Minhas usinas** (generator area) — large; only for users with generator access; needs a generator test account.
2. Marketplace catalogue filters / sorting (portal: category, points range, sort).
3. Referral code at app sign-up (portal: `/indicacao/[code]` landing) — product decision.
4. In-app password-reset form (today the e-mail link opens the web page).
5. Maintenance state (`/manutencao`) — product decision.

### 15.5 Backend dependencies

1. Test data to exercise the new flows live: an active consumer product (`PRODUTO_FISICO`/`PRODUTO_DIGITAL`, stock > 0, `tipo_publico CONSUMIDOR`) and points on the test account (redemption + cancel); a generator test account (Minhas usinas).
2. Confirm the item shapes assumed in §15.3 (orders, referred people, generator requests) and the generator-request status vocabulary.
3. Confirm `GET /v1/pedidos` is consumer-scoped for consumers.
4. Referral program flag (`programaAtivo=false` in homologation) — confirm intended behaviour.
5. Pix / boleto content still blocked by the Sisprime `nosso_numero` issue (§10.6).

### 15.6 Verification (2026-10-05)

`npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ **73 passed** (1 live suite skipped; new `parity-features.test.ts`, scope guard extended for `POST /v1/pedidos/{id}/cancel` and `POST /v1/gerador-interest-requests`) · `npm run test:live` **40 ok · 0 failed · 1 skipped** (reward detail: no consumer product in homologation) — **102 GET, 0 write requests**. New live reads: points statement, my redemptions, referral program, generator access. The new write flows (request generator access, redeem, cancel) are covered by unit tests only — the live suite does not create data.

## 16. Final client-review readiness (2026-10-05)

### 16.1 Final parity checklist (vs. `cliente.appacvel.com.br`)

| Area | Portal | App | Status |
|---|---|---|---|
| Dashboard | `/inicio` | Início tab | ✅ |
| Profile | `/perfil` | Conta › Dados pessoais | ✅ |
| Documents | perfil / cadastro | Conta › Documentos (upload, open) | ✅ |
| Units | `/minhas-residencias*` | Conta › Minhas unidades (list, detail, registration with bill OCR, correction) | ✅ |
| Generator request | "Quero ser gerador" (`/perfil`) | Conta › Quero ser gerador | ✅ |
| Invoices | `/faturas*` | Faturas tab, detail, PDF, payment history | ✅ |
| Payment consultation | `/pagamentos/pix`, `/pagamentos/boleto` | invoice › Pix / Boleto (existing charge only) | ✅ (content depends on the backend charge, §10.6) |
| Economy | `/economia`, `/bi` | Economia tab (incl. BI KPIs, *Custo* chart) | ✅ |
| Benefits | `/pontos*` | Benefícios tab + Extrato de pontos | ✅ |
| Marketplace | `/marketplace*` | rewards, reward detail + redemption, Meus resgates + cancel | ✅ (catalogue filters/sorting not ported) |
| Referral | `/indicacao*` | link/share/counters + Regras e meus indicados | ✅ (no referral code at app sign-up) |
| Notifications | `/notificacoes`, `/perfil/preferencias` | Notificações + Configurações | ✅ |
| Support | `/suporte*` | Ajuda e suporte (list, new, conversation, WhatsApp when configured) | ✅ |
| Account deletion | perfil | Conta › Excluir conta | ✅ (cancel route missing on the legacy auth-api) |
| Minhas usinas | `/minhas-usinas*` (generator only) | — | ❌ next phase |

### 16.2 Production-readiness review

| Check | Finding | Status |
|---|---|---|
| Loading states | every data screen uses `QueryView` (layout-shaped skeleton on first load; cached data kept on refresh); buttons show loading labels | ✅ |
| Empty states | friendly empty states with next action on lists (invoices, units, documents, notifications, support, redemptions, statement, referred) | ✅ |
| Error handling | `AppError` with pt-BR messages; backend business messages only for 4xx business codes; 5xx never exposes backend text; every form/mutation shows its error. **Fixed:** "Marcar todas como lidas" had no failure feedback | ✅ |
| Offline | `NETWORK_UNAVAILABLE` + offline banner; `QueryView` offline state with retry | ✅ |
| API timeout | `AbortController` per request (`EXPO_PUBLIC_API_TIMEOUT_MS`) → "O servidor demorou para responder" | ✅ |
| Permission handling | 403 → "Seu perfil não tem permissão…"; camera permission requested with pt-BR rationale and settings hint; gallery / files via system pickers | ✅ |
| Firebase session expiration | 401 → one forced token refresh + retry → still 401 → session ended with notice; Firebase session loss → same. **Fixed:** a 401 whose body is a backend database failure (legacy auth-api during an outage, §10.6) no longer signs the user out — it is reported as "serviço indisponível" (unit-tested) | ✅ |
| Deep links | scheme `acvel`; portal notification links mapped to app screens (only relative same-app paths trusted). **Fixed:** `/pontos/extrato`, `/marketplace/resgates`, `/marketplace/{id}`, `/indicacao*` now open the new screens (unit-tested) | ✅ (push not enabled: no device-registration endpoint) |
| Navigation consistency | tabs + stack groups (invoice, residence, support, account, benefits) with pt-BR titles; route builders only (`navigation/routes.ts`), typed routes regenerated | ✅ |

### 16.3 API integration review

| Check | Result |
|---|---|
| Screen → Hook → Service → API client | ✅ no screen/component imports a service or calls `api`/`fetch`; no hook calls the API directly. **Fixed:** the login screen read `authService.demoCredentials` directly → `useDemoCredentials()` hook |
| Duplicated API logic | ✅ single client (`apiClient.ts`: auth header, refresh/retry, timeout, error mapping) + `file-transfer.ts` for uploads/downloads; shared parsers (`zList`, `zNumber…`) |
| Hardcoded URLs | ✅ API/portal/CEP URLs from env (`config`). **Fixed:** legal links pointed to `acvel.com.br/termos` and `/privacidade` (both **404**) → portal page `{EXPO_PUBLIC_PORTAL_URL}/termos-de-uso-e-privacidade` (200). Remaining literal: `https://wa.me/` (WhatsApp deep link, intended) |
| Sensitive data | ✅ `devLog` is dev-only and logs method/path/status/timing only; no tokens/bodies logged; tokens never persisted by the app (native Firebase keychain/keystore) |
| Test credentials | ✅ none in tracked files or git history (scan of 240 files); the mock-mode demo login (fake data) is shown only in `__DEV__` + mocks and is `null` against the real API |
| Scope guard | ✅ `app-scope.test.ts`: no invoice/charge/Pix/boleto generation, no ADM endpoint; marketplace writes limited to own redemption + cancel; generator access only requested |

### 16.4 Mobile UX review

| Check | Result |
|---|---|
| Portuguese texts | ✅ all UI copy pt-BR (no English UI strings found); labels via `utils/status-labels` (raw enums never rendered) |
| Button labels | ✅ verb-first pt-BR labels; payment buttons only open existing payment info; destructive actions confirmed in a dialog |
| Form validation | ✅ zod schemas + inline errors + scroll-to-first-error (`FormScroll`); generator message capped at 1000 chars |
| Keyboard | ✅ every screen with inputs is `keyboardAware`; Android `softwareKeyboardLayoutMode: resize` |
| Safe areas | ✅ `Screen` handles insets; tabs use top edge; footers above the home indicator |
| Android / iOS | ✅ portrait, light/dark (`userInterfaceStyle: automatic`), native Firebase, image/document pickers on both; Android release build validated (§8); **iOS not built** (needs macOS/EAS); no device/emulator validation on this host |

### 16.5 Remaining bugs / risks (app)

1. No device or emulator validation yet (Android debug APK built; iOS never built).
2. Store build configuration missing: no `eas.json`, no iOS `buildNumber` / Android `versionCode` strategy, no production Firebase native files (`acvel-prod`) — required before store submission.
3. Push notifications not wired (backend has no device-registration endpoint).
4. Portal features not ported: Minhas usinas; marketplace filters/sorting; referral code at sign-up; in-app password-reset form; maintenance state.
5. Item shapes assumed from the portal (orders, referred people, generator requests) — unverified live (§15.3).

### 16.6 Backend requirements (consolidated)

1. **Generator test account** (consumer with `is_generator`) + plants, to build/validate **Minhas usinas**.
2. **Marketplace test data**: at least one active consumer product (`PRODUTO_FISICO`/`PRODUTO_DIGITAL`, stock > 0, `tipo_publico CONSUMIDOR`) and points on the test account (redeem → "Meus resgates" → cancel).
3. **Referral test data**: a referred consumer (to see the masked list and reward statuses); clarify `programaAtivo=false` / `INDICACAO.REFERRAL_ENABLED=false` in homologation.
4. **Pix / boleto**: fix the Sisprime `nosso_numero` sequence so the open test invoice gets a registered hybrid boleto (§10.6).
5. **Support**: `suporte` READ/CREATE for `consumidor_basico` (the test user uses the temporary role, §9.4); admin ticket list returns 0; unknown ticket returns 200.
6. **Auth-api**: return 503 (not 401 + Prisma text) on database failures; `GET`/`DELETE /v1/auth/account/delete-request`; `onboarding_completed` consistent with consumer status.
7. **Billing data**: invoice `PAGA` / charge `PENDENTE` mismatch; `total_sem_acvel = 0`; Digital Grid detail 404 / PDF 403; `paga_em` null.
8. **Swagger/API documentation gaps**: no Swagger for the auth-api; response schemas missing for list endpoints (`/v1/pedidos`, `/v1/consumidores/me/indicados`, `/v1/gerador-interest-requests/me`, `/v1/pontos/me`, notifications, support, snapshot); generator-request status enum and redemption status enum undocumented; document `signed_url` contract (API-relative + Bearer).
9. **Push**: device-registration endpoint (if push is in scope).

### 16.7 Verification

`npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ **75 passed** (1 live suite skipped) · `npm run test:live` **40 ok · 0 failed · 1 skipped** (reward detail: no consumer product) — 102 GET, 0 write requests.

## 17. Demo preparation (2026-10-05)

Release documents: `docs/release-checklist.md` (env, Firebase, Android/iOS build, testing, limitations), `docs/client-demo-checklist.md` (per-flow demo with loading/empty/error states), `docs/backend-requirements.md` (consolidated backend/client actions).

Release configuration (no feature changes): `app.json` → `android.versionCode 1`, `ios.buildNumber "1"`, `ios.config.usesNonExemptEncryption false`, image-picker `microphonePermission false` (blocks `RECORD_AUDIO`); `.env.example` portal comment. expo-doctor 21/21.

Demo APK: **v2 (2026-10-07)** `C:\acvel-build\dist\ACVEL-Consumidor-1.0.0-hml-demo-v2.apk` (49.5 MB, SHA-256 `ea0be0e9…8ded`): `assembleRelease` arm64-v8a, BUILD SUCCESSFUL, signature verified, homologation environment with `APP_ENV=preview`, `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` blocked (`app.json` `android.blockedPermissions`), no test credentials in the bundle. v1 (2026-10-05, `ACVEL-Consumidor-1.0.0-hml-demo.apk`) superseded. Details: `docs/release-checklist.md` §3.6. Device installation not yet performed. Checks: `npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ 75 passed.

## 18. Sisprime `nosso_numero` investigation (2026-10-08) — backend fix plan

Read-only investigation (GET requests only; nothing created, cancelled or retried). **Mobile app unchanged**: it correctly shows "Pix/Boleto ainda não disponível" because the backend has no registered charge.

### 18.1 Source-code availability (important)

The deployed **rateio-api** source is **not in this repository or workspace**. The only backend here, `consumidor-gerador-api`, is a separate new service (modules `auth`, `health`, `users`; `nosso_numero` appears only as a schema column) and is **not** what serves `api-acvel.souaiv.com/api/rateio`. Therefore the exact file/function that generates `nosso_numero` could not be opened. The findings below are **evidence from the deployed API** plus clearly marked **inferences**; the backend team must confirm them in the rateio-api code (§18.6).

### 18.2 Evidence (homologation, read-only)

| Observation | Source |
|---|---|
| Homologation has **1 196 invoices**: 1 147 `DIGITAL_GRID_HISTORICO` (imports), 48 `MOTOR_ACVEL_COMPENSADA_V1` (billing engine: 4 UCs × 12 competências, all created 2026-08-03), 1 `COBRANCA_MANUAL_AVULSA` (our W4 test invoice) | `GET /v1/faturas` (all pages) |
| The **only Sisprime boleto record in homologation** is the one for the test invoice | `GET /v1/sisprime/boletos/fatura/{id}` for all 49 non-historical invoices |
| That record: `nosso_numero 00000000001`, `numero_documento 0000000001`, created 2026-10-02 15:06 UTC, `status_registro ERRO`, `tentativas_registro 5`, `integrado_com_if false`, `id_boleto null`, `ultimo_erro` "Entrada Rejeitada: O campo [Nosso Número] não pode se repetir." | same |
| The 48 billing-engine invoices have charges `SISPRIME`/`PENDENTE` with **no** payload, no `gateway_payment_id`, no `erro` and **no Sisprime record**; 43 are `PAGA` with `paga_em` set (marked paid without a bank registration) | `GET /v1/pagamentos/cobrancas?fatura_ids=…` |
| Attempt history of the test record: 1 at creation (15:06), 2 and 3 by the W4 retries (`POST /pagamentos/cobrancas` BOLETO, then PIX — both answered 500), 4 and 5 automatic; last update **2026-10-02 17:00:00 UTC**; **no attempt since** (6 days) | record `tentativas_registro`/`updated_at`; §10.2 |
| Every attempt carried the same `nosso_numero 00000000001` | record unchanged across attempts |
| The invoice is `PENDENTE`, due **2026-10-16**, `pdf_status PREVIEW`; its exposed charge is `BOLETO`/`FALHOU` with `pix_qr_code`, `pix_txid`, `boleto_linha_digitavel`, `boleto_codigo`, `boleto_url_pdf`, `gateway_payment_id` all null | `GET /v1/faturas/{id}`, `GET /v1/pagamentos/cobrancas?fatura_id` |

### 18.3 Root cause

1. **The number comes from the homologation database, not from the bank.** The record got `nosso_numero = 00000000001` and `numero_documento = 0000000001` — the same counter value 1 — and it is the first Sisprime record ever stored in homologation. *Inference:* the generator derives the next number from local state (a DB sequence/counter or "max/count of existing Sisprime records + 1"), not hardcoded per se, but starting at 1 on an environment whose table was empty.
2. **The Sisprime sandbox already used number 1.** The sandbox (beneficiary/convênio) keeps its own history and rejects any repeated `nosso_numero`. *Inference:* the same sandbox beneficiary is (or was) used by other environments or by earlier homologation databases (developer/local setups, a previous reset), each of which also started at 1. Any environment whose local counter restarts will collide.
3. **Retries reuse the stored number.** The number is persisted on the record when it is created; every retry (manual `POST /pagamentos/cobrancas`, `…/reenviar-registro-sisprime`, `/sisprime/reprocessar-falhas`, automatic job) re-sends the same `00000000001`, so the failure is deterministic.
4. **Retries stopped at 5.** *Inference:* the automatic job runs at the top of the hour (attempts at 16:00 and 17:00 UTC after the 15:06 creation; the API's `aviso` promised "reprocessado automaticamente em até 1h") and has a **limit of 5 attempts** — nothing ran after the 5th. The failed record will not be retried again automatically.
5. **No bank-side record exists.** All 5 attempts were rejected at entry (`integrado_com_if false`, `id_boleto null`), so there is no boleto/Pix at Sisprime for this invoice — a corrected re-registration cannot duplicate a bank record.
6. Side issues: a rejected registration surfaces as **HTTP 500** on `POST /pagamentos/cobrancas`; the exposed charge id equals the invoice id (`GET /pagamentos/cobrancas/{id}` → 404).

### 18.4 Fix options (not applied)

**Option A — fix the generator (permanent; recommended).**
- *Where:* rateio-api Sisprime module — the code that creates the Sisprime boleto record and assigns `nosso_numero`/`numero_documento` (used by `cobranca-avulsa`, `/pagamentos/cobrancas`, `/sisprime/registrar-boleto`, `registrar-lote`, `reprocessar-falhas`, `reenviar-registro-sisprime`).
- *Change:* allocate numbers from a **dedicated database sequence** (atomic `nextval`, never "max + 1"/"count + 1"); make the **start/range configurable per environment** (e.g. `SISPRIME_NOSSO_NUMERO_START`, or an environment prefix inside the field width allowed by the convênio); add a **unique constraint** on (beneficiary/convênio, `nosso_numero`). On the specific Sisprime rejection "Nosso Número não pode se repetir", **burn the number** (keep it in the record's history), allocate the next one and retry (bounded). On transient errors (timeout, 5xx, unknown outcome) **keep the same number** and first query Sisprime for it, so a registration that succeeded but whose response was lost is never registered twice under a new number. Return 4xx/502 with the gateway message instead of 500.
- *DB:* new sequence + unique index (migration); optional `nosso_numero_historico`/attempt log.
- *Risk:* medium — touches the registration path used by production billing; requires tests for allocation, collision-retry and lost-response cases.
- *Rollback:* redeploy the previous version; the sequence/index can stay (harmless). Numbers already burned are simply skipped.
- *Production:* code applies to all environments. Deploy with production's start value = its current next number (no jump, no reuse) and verify the unique index migration against existing production data first.
- *Prevents duplicates permanently:* yes (sequence + unique constraint + per-environment range + reconcile-before-renumber).

**Option B — re-seed the homologation sequence (quick unblock).**
- *Where:* homologation database only (data/sequence operation, no code change) — move the homologation counter to a range the sandbox has never used (e.g. a high prefix block agreed with Sisprime), and update the existing failed record's `nosso_numero`/`numero_documento` (or let the next allocation replace it) and reset its attempt counter so it can be re-sent.
- *DB:* `setval`/counter update + one record update in homologation.
- *Risk:* low for production (none if executed only on the homologation DB); medium for correctness — **not permanent**: if the generator still uses "count/max + 1" or a DB reset happens, collisions return; another environment sharing the sandbox may still hit the same range.
- *Rollback:* restore the previous counter value / record values (but never reuse numbers already sent to the bank).
- *Production:* not affected if run on homologation only; confirm the connection target before executing.
- *Prevents duplicates permanently:* no — only with Option A.

**Option C — separate sandbox beneficiary per environment** (complementary): ask Sisprime for a distinct sandbox convênio for homologation (and another for dev/local), so counters never overlap. No code change if the convênio is configuration; requires Sisprime onboarding.

**Recommendation:** **A**, with **B** as the immediate homologation unblock if A cannot be deployed before the test invoice's due date; consider **C** to isolate environments.

### 18.5 Existing test invoice `9b4f3366-7b70-4566-a7da-d46017dc3837`

**Recommended: keep it and re-register its existing failed charge after the fix** (one record, nothing at the bank yet, no new test data). Conditions:
- The automatic job will not pick it up (5/5 attempts used) — the re-registration must be a single, deliberate backend action (`POST /v1/pagamentos/cobrancas/{id}/reenviar-registro-sisprime` or `POST /v1/sisprime/registrar-boleto`) **after** the record has a new valid number.
- **Due date 2026-10-16**: registering a boleto close to/after its due date may be rejected or expire immediately. If the fix is not deployed with a few days of margin, prefer **cancel + one new invoice** (`POST /v1/faturas/{id}/cancelar` — its Sisprime write-off request should be a no-op because nothing was registered; then one new `cobranca-avulsa` with a future due date and an unused competência).

### 18.6 What the backend team must confirm in the rateio-api code

1. How `nosso_numero`/`numero_documento` are computed (sequence vs. count/max) and whether the start is configurable per environment.
2. Whether the number is re-generated on retry (evidence: it is not).
3. Retry job schedule and maximum attempts (evidence: hourly, stops at 5).
4. Which Sisprime beneficiary/convênio homologation uses and whether it is shared with other environments.
5. Production: last allocated `nosso_numero` and absence of collisions (read-only check).

### 18.7 Expected payment response after a successful registration

Fields the app reads from `GET /v1/pagamentos/cobrancas?fatura_id=` (all present in today's response contract, currently null):

| Field | Expected after success | App use |
|---|---|---|
| `status` | `PENDENTE` (awaiting payment) → app shows the payment screen; `CONFIRMADO` after payment | charge status |
| `pix_qr_code` | EMV "copia e cola" payload | QR code (rendered by the app) + copy |
| `pix_qr_code_base64` | probably null (the portal notes Sisprime returns only the EMV) | not required |
| `pix_txid` | expected to be set | not displayed |
| `pix_expira_em` | may stay null for the hybrid boleto (`boleto_expira_em` = due date) | countdown only when set |
| `boleto_linha_digitavel` | 47 digits | copy/share |
| `boleto_codigo` | 44-digit barcode | barcode |
| `boleto_url_pdf` | may be null; app shows "Baixar boleto" only for an https URL | optional |
| `gateway_payment_id` | expected to be set (Sisprime id) | not displayed |
| `erro` | null | — |

Invoice: `pdf_status` leaves `PREVIEW` once Sisprime confirms the boleto as registered with Pix (today `GET /v1/faturas/{id}/pdf` answers 409 "PDF oficial ainda não está disponível … Sisprime ainda não confirmou o boleto como REGISTRADO com QR Code PIX"); the official PDF then downloads (app shows "Baixar PDF"). Sisprime record: `status_registro` registered, `linha_digitavel`, `qr_code_pix`, `id_boleto` set, `integrado_com_if true`. Exact new enum values (`status_registro`, `pdf_status`) are not documented — confirm with the backend.

### 18.8 Retest plan (after backend approval)

1. Backend deploys the fix (A) or re-seeds homologation (B); confirms the test record's new `nosso_numero`.
2. Backend performs **one** re-registration of the existing charge (or, per §18.5, cancel + one new invoice).
3. Read-only check (`scratchpad p16-pix-check` equivalent): Sisprime record `status_registro` registered, `tentativas_registro` +1, `ultimo_erro` null.
4. Charge: `pix_qr_code` present, `erro` null, status `PENDENTE`.
5. Charge: `boleto_linha_digitavel` (47 digits) and `boleto_codigo` present.
6. Open the Consumidor app on LDPlayer → Faturas → the open invoice → Pagar fatura → Pix.
7. Press **Atualizar**.
8. QR code + "Pix copia e cola" appear (copy works); status chip "Aguardando pagamento".
9. Boleto screen: linha digitável, barcode, copy/share.
10. Invoice detail: "Baixar PDF" enabled once `pdf_status` leaves `PREVIEW`; PDF opens.
11. `npm run test:live` (read-only) → Pix/Boleto checks report payload present. No new test records besides the one re-registration.

### 18.9 Production risk assessment

- Production is **not touched** by this investigation.
- If production uses the same generator with its own database starting at 1 and its own convênio, it works only as long as its counter never restarts and no other environment uses that convênio. A DB restore/migration that resets the counter, or a shared convênio, would produce the same "Nosso Número não pode se repetir" failures for real customers — with invoices left without Pix/boleto.
- Option A's code path is shared with production: deploy with production's current next number, verify the unique index on existing data, and test lost-response handling to avoid **duplicate bank boletos** (the main financial risk of any renumbering logic).
- Option B is homologation-only (verify the connection target).

## 19. Confirmed portal routes and URL configuration (2026-10-08)

URLs are **environment-based** (`src/config/env.ts`); route paths live only in `src/navigation/portal-links.ts` (no hardcoded hosts). Production builds reject non-https values.

### 19.1 Variables

| App | Variable | Value |
|---|---|---|
| Consumidor | `EXPO_PUBLIC_CONSUMIDOR_APP_URL` | `https://cliente.appacvel.com.br` (legacy `EXPO_PUBLIC_PORTAL_URL` read as fallback) |
| Consumidor | `EXPO_PUBLIC_TERMS_URL` | `https://cliente.appacvel.com.br/termos-de-uso-e-privacidade` |
| Consumidor | `EXPO_PUBLIC_PRIVACY_URL` | `https://cliente.appacvel.com.br/termos-de-uso-e-privacidade` |
| Licenciado (future app — not in this repository) | `EXPO_PUBLIC_LICENCIADO_WEB_URL` | `https://licenciado.appacvel.com.br` |
| Licenciado (future app) | `EXPO_PUBLIC_TERMS_URL` | `https://licenciado.appacvel.com.br/termos-de-uso-e-privacidade` |
| Licenciado (future app) | `EXPO_PUBLIC_PRIVACY_URL` | `https://licenciado.appacvel.com.br/termos-de-uso-e-privacidade` |

### 19.2 Confirmed routes (checked 2026-10-08, public GET)

| Flow | Route | Check | Used by the Consumidor app |
|---|---|---|---|
| Terms + privacy (single combined page) | `<consumidor>/termos-de-uso-e-privacidade` | 200 | Conta › "Termos de uso e privacidade" (one entry when terms = privacy; two entries only if different URLs are configured) |
| Consumer sign-up with representative | `<consumidor>/auth/cadastro?codigo_representante=<codigo>` | 200 | builder `portalLinks().signup(code)` — the link licenciados share; the app's own sign-up has no representative field (gap, §15.4) |
| Consumer referral | `<consumidor>/indicacao/<codigo>` | 200 | Benefícios / Indique e ganhe (copy + share) |
| Consumer login | `<consumidor>/auth/login` | 200 | builder `portalLinks().login()` |
| Minhas Faturas | `<consumidor>/faturas` | redirects to `/auth/login` without a web session | builder `portalLinks().invoices()`; the app never links to a portal invoice detail (invoices open in the app with the app session) |
| Licenciado login | `https://licenciado.appacvel.com.br/auth/login` | 200 | Licenciado app (future) |
| Licenciado terms/privacy | `https://licenciado.appacvel.com.br/termos-de-uso-e-privacidade` | 200 | Licenciado app (future) |

No separate privacy route was created. Builders return `null` when the portal origin is not configured, and the screen then hides the action.

### 19.3 Per-environment portal (2026-10-09)

Portal links must use the portal of the **same environment** as the APIs/Firebase (homologation referral codes exist only on the homologation portal).

| Environment | APIs / Firebase | `EXPO_PUBLIC_CONSUMIDOR_APP_URL` | `EXPO_PUBLIC_TERMS_URL` = `EXPO_PUBLIC_PRIVACY_URL` | Template |
|---|---|---|---|---|
| Homologation (demo APK) | `api-acvel.souaiv.com` / `teste---00` | `https://cliente-test.appacvel.com.br` | `https://cliente-test.appacvel.com.br/termos-de-uso-e-privacidade` | `.env.homologation.example` |
| Production | `api.appacvel.com.br` / `acvel-prod` | `https://cliente.appacvel.com.br` | `https://cliente.appacvel.com.br/termos-de-uso-e-privacidade` | `.env.production.example` |

The referral link is built from `EXPO_PUBLIC_CONSUMIDOR_APP_URL` (`<portal>/indicacao/<codigo>`); the API's `link` is the fallback when no portal is configured. In homologation both now agree (`cliente-test`).

Verified 2026-10-09 against the homologation portal with real homologation codes (read-only; codes not logged):

| Check | Result |
|---|---|
| Terms/privacy `cliente-test…/termos-de-uso-e-privacidade` | 200 — "Termos de Uso e Privacidade \| ACVEL Consumidores" |
| Referral `cliente-test…/indicacao/<homologation code>` | 200 (same host as the API's own `link`) |
| Sign-up `cliente-test…/auth/cadastro?codigo_representante=<homologation licenciado code>` | page 200; the portal's representative lookup `GET /v1/consumidores/representante/by-codigo/{codigo}` → 200 (`tipo, codigo_representante, cupom, licenciado, sublicenciado`) |
| Minhas Faturas `cliente-test…/faturas` without session | redirects to `/auth/login` |

### 19.4 Tests

`src/navigation/__tests__/portal-links.test.ts` (all confirmed routes, `codigo_representante` encoding, combined vs. split legal pages, not-configured → null) and `src/config/__tests__/env.test.ts` (new variables, legacy fallback, https enforced in production).

Demo APK **v3** (2026-10-09): `C:\acvel-build\dist\ACVEL-Consumidor-1.0.0-hml-demo-v3.apk` (SHA-256 `43d235c3…afc8`) — homologation APIs + homologation portal links (§19.3); bundle contains `cliente-test` URLs only. Checks: `npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ 83 passed (new `env-templates.test.ts`). On-device click-through still to be done on LDPlayer (§19.3 lists the expected results).
