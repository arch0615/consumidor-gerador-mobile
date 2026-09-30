# Live API validation — ACVEL Consumidor mobile

Status of the move from mock mode to the real ACVEL backends. Updated 2026-09-30.

| Area | Status |
|---|---|
| Firebase native configuration | **Configured, waiting for the client's files** (`firebase/google-services-android.json`, `firebase/GoogleService-Info.plist`) |
| Environment (`.env`, mocks off) | Done |
| API reachability (3 APIs) | Verified live (health + 401 on protected routes) |
| Contract validation vs. Swagger (Business, Rateio) | Done — 35/35 endpoints exist; mismatches fixed (§4) |
| Authenticated runtime validation (login → all modules) | **Pending test account** (`.env.test.local`) — harness ready: `npm run test:live` |
| Upload validation (PDF / image) | **Pending test account** — `npm run test:live -- --writes` |
| Android build | **Pending Firebase files** (Gradle `google-services` plugin requires the real JSON) |
| typecheck / lint / unit tests / expo-doctor | Pass (36 tests, 1 live suite skipped) / 21 of 21 |

---

## 1. Firebase

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

**To verify once the files are added:** package/bundle id inside the files must be `com.acvel.app`; then `npx expo prebuild --clean`, `npx expo run:android`, sign in, kill the app, reopen (session restored), sign out, reopen (Login shown).

## 2. Environment

`.env` (git-ignored) now contains:

```
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_AUTH_API_URL=https://api-acvel.souaiv.com/api/auth
EXPO_PUBLIC_BUSINESS_API_URL=https://api-acvel.souaiv.com/api/business
EXPO_PUBLIC_RATEIO_API_URL=https://api.appacvel.com.br/api/rateio
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

## 6. Remaining work

1. Add `firebase/google-services-android.json` + `firebase/GoogleService-Info.plist` (id `com.acvel.app`).
2. Add `.env.test.local` with `ACVEL_TEST_EMAIL` / `ACVEL_TEST_PASSWORD` (test consumer), then:
   - `npm run test:live` → fills §7 (per-module results, real response shapes, null fields).
   - `npm run test:live -- --writes` → PDF + image upload, document status, signed URL.
3. `npx expo prebuild --clean && cd android && ./gradlew assembleDebug` → Android build + on-device check of Firebase init, login, restore, logout.
4. iOS build requires macOS/EAS (not possible on this Windows host).

## 7. Live results

_Pending — populated from `.live-report.json` after `npm run test:live`._
