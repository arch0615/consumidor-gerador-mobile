# API integration — ACVEL Consumidor mobile

How the app talks to the ACVEL backends, what each screen calls, and what is still missing on the backend side.

## 1. Architecture

```
Screen (src/app)  →  Hook (src/features/*/hooks, TanStack Query)  →  Service interface (src/services/*.service.ts)
                                                                       ├─ remote/*.remote.ts  → api/apiClient.ts → Auth / Business / Rateio APIs
                                                                       └─ mock/*.mock.ts      → src/mock/* (EXPO_PUBLIC_USE_MOCKS=true only)
```

- Each `*.service.ts` exports `config.useMocks ? mockX : remoteX`. Screens and hooks are identical in both modes.
- `services/api/apiClient.ts` is the only HTTP entry point: base URL per API from env, `Authorization: Bearer <Firebase ID token>`, one forced token refresh + retry on 401 then sign-out, timeout, error normalisation to `AppError`, Zod validation of every response, dev logging (method, path, status, duration only).
- `services/api/file-transfer.ts`: native uploads with progress (presigned URLs, multipart OCR) and authenticated downloads (invoice PDF).
- `services/firebase/`: Firebase JS SDK with its session persisted in the Keychain/Keystore (chunked Secure Store adapter), never in AsyncStorage.

## 2. Contract sources

| API | Source of truth used |
|---|---|
| Auth (`EXPO_PUBLIC_AUTH_API_URL`) | `consumidor-gerador-api` Swagger (`openapi.json`) + its Zod schemas (`src/modules/auth/auth.schema.ts`, `users.schema.ts`, `shared/errors/error-codes.ts`). Note: the exported `openapi.json` has empty `components.schemas` (unresolved `$ref`s) — the Zod source was used. |
| Business / Rateio | **No Swagger reachable** (the upstream `api-acvel.souaiv.com/{business,rateio}/api` answers 404 for docs and routes; the env URLs of the web portal are empty in the repo). Contracts were taken from the production web client (`consumidor-gerador-web/src/services/**`) and are enforced at runtime with Zod: a mismatch surfaces as `INVALID_RESPONSE` (dev log shows the failing fields) instead of wrong data. **Validate against the real Swagger when available.** |

## 3. Endpoint matrix

| Feature | Method + path (API) | Notes |
|---|---|---|
| Session | Firebase `signInWithEmailAndPassword`, `sendPasswordResetEmail`, `reauthenticateWithCredential`, token refresh | Persisted in Secure Store; `onIdTokenChanged` ends the app session when Firebase drops it |
| Identity | GET `/v1/auth/me` (auth) | Validated at launch and after sign-in. 403 `ACCOUNT_NOT_PROVISIONED`/`PLATFORM_FORBIDDEN`/`ACCOUNT_*` → signed out with a banner |
| Sign-up | POST `/v1/auth/register` (auth, public) → Firebase sign-in | `displayName`, `email`, `password`, `phoneNumber` (national digits) |
| Profile | GET `/v1/auth/me` + GET `/v1/consumidores/me` (business); PATCH `/v1/users/me` (auth) + PATCH `/v1/consumidores/{id}` (business) | Same two-record sync as the web portal |
| Password | PATCH `/v1/auth/change-password` (auth) → Firebase sign-in with the new password | Backend revokes all sessions; this device re-authenticates |
| Account deletion | GET/POST/DELETE `/v1/auth/account/delete-request` (auth) | Password confirmed via Firebase re-auth first (endpoint has no body); cancel supported |
| Dashboard | `/v1/auth/me`, `/v1/consumidores/me/rateio-snapshot`, `/v1/consumidores/me/ucs`, `/v1/ucs/minhas-ucs`, `/v1/concessionarias`, `/v1/notificacoes/nao-lidas/count`, `/v1/documentos` | Composed client-side (no consumer dashboard endpoint) |
| Invoices | GET `/v1/faturas/me?page&per_page&competencia_inicio&status` (rateio), fallback snapshot | Generator plant bills (`ACVEL_USINA`) excluded |
| Invoice detail | GET `/v1/faturas/{id}` (rateio) + snapshot (kWh, savings, paid date) | |
| Invoice PDF | GET `/v1/faturas/{id}/pdf` (rateio, Bearer) → cache → share sheet | Disabled when `pdf_status = PREVIEW` |
| Pix / boleto | GET `/v1/pagamentos/cobrancas?fatura_id=` (rateio), polled every 4 s while pending | States: AGUARDANDO, PROCESSANDO (not yet registered), CONFIRMADO, EXPIRADO, FALHOU (FALHOU/ESTORNADO). Barcode derived from the 47-digit line when the API omits it |
| Payment history | Snapshot invoices with paid status | |
| Units list/detail | GET `/v1/consumidores/me/ucs[/{id}]` (business) + snapshot UCs + `/v1/ucs/minhas-ucs` (rateio) | Billing-only units (no registration) are read-only |
| New/edit unit | POST `/v1/documentos/presign-upload` → PUT bytes → POST `/v1/documentos/confirm-upload` (tipo `FATURA_ENERGIA`); POST `/v1/fatura-ocr/processar` (rateio, multipart `arquivo`); POST / PATCH `/v1/consumidores/me/ucs[/{id}]` | Blocked while `dg_status = PENDENTE_VINCULO`. CEP via `EXPO_PUBLIC_CEP_API_URL` (BrasilAPI) |
| Economy | Snapshot `summary.por_competencia` | "Sem ACVEL" from the billing engine when present, legacy approximation otherwise |
| Notifications | GET `/v1/notificacoes?perPage=50`, GET `/v1/notificacoes/nao-lidas/count`, PATCH `/v1/notificacoes/{id}/ler`, POST `/v1/notificacoes/ler-todas` (business) | Portal links (`dados.link`) mapped to app routes; unknown/external links ignored |
| Notification settings | GET/PUT `/v1/notificacoes/preferencias` (business) | Only push, e-mail and marketing are persisted |
| Support | GET/POST `/v1/support/tickets`, GET `/v1/support/tickets/{id}`, GET/POST `/v1/support/tickets/{id}/messages`, GET `/v1/client-configuracoes/whatsapp-atendimento` (business) | |
| Documents | GET `/v1/documentos?proprietario_tipo=CONSUMIDOR&consumidor_id=`, presign/confirm upload, GET `/v1/documentos/{id}/signed-url` (business) | Tap a document to open it |
| Benefits | GET `/v1/pedidos/me/context`, GET `/v1/pontos/me`, GET `/v1/consumidores/me/indicacao`, GET `/v1/produtos`, POST `/v1/pedidos` + `Idempotency-Key` (business) | Referral link = `EXPO_PUBLIC_PORTAL_URL/indicacao/<code>` |

## 4. Error handling

| Situation | Behaviour |
|---|---|
| 401 | Force-refresh the Firebase token, retry once; still 401 → session ends, Login shows "Sua sessão expirou" |
| 403 | "Seu perfil não tem permissão…" (account problems on `/auth/me` → signed out with the reason) |
| 404 | Empty/not-found state (lists treat "no consumer/snapshot yet" as empty) |
| 409 / 422 / 400 | Backend business message shown (technical-looking text filtered) |
| 5xx | Generic message + retry; TanStack Query retries transient errors twice |
| Offline / timeout | Offline state or banner; queries pause and resume on reconnect |
| Contract mismatch | `INVALID_RESPONSE` + dev log of the failing fields |
| Invalid config | Blocking "Aplicativo indisponível" screen (issues listed in dev builds) — never falls back to mocks |

## 5. Known limitations / backend dependencies

1. **No Swagger for business/rateio** — contracts inferred from the web client (see §2).
2. **Support attachments** — the ticket API has no attachment field/endpoint; the attachment UI is hidden in API mode (`supportService.capabilities.attachments = false`).
3. **Notification preferences** — WhatsApp and SMS are not persisted by `PUT /v1/notificacoes/preferencias`; shown as read-only ("Em breve").
4. **Push notifications** — no device-registration endpoint; `services/push/push.ts` is a no-op seam.
5. **Consumer onboarding** (documents, personal data, terms, submit — `/v1/onboarding/consumidor/*`) is not in the app; new consumers get a Home alert pointing to the portal. CPF is therefore not collected at sign-up (the register endpoint has no CPF field).
6. **Credit balance (kWh)** is not exposed by any endpoint — the Home card is hidden.
7. **Contract signing** — the app opens `contrato.signing_url` when the unit payload includes an https URL; return/deep link not wired.
8. **Invoice/payment method** — payment history uses the snapshot; the method is shown only when `metodo_pagamento` is present.
9. **Bill upload type** — the web portal accepts only PDF for `FATURA_ENERGIA`; the app also allows photos (camera). Confirm the business API and OCR accept JPEG/PNG, or restrict the uploader.
10. **Deletion reason** — the API takes no reason, so none is collected.
11. **Dashboard** is composed from ~7 requests (no aggregate endpoint); a `GET /v1/me/dashboard` would cut launch latency.
12. **Document checksum** — sent as `<timestamp>-<size>` (same as the web portal), not a content hash.

## 6. Testing

- `npm test` — API client (Bearer, 401 refresh/retry/logout, timeout, offline, 204, schema mismatch, idempotency key), error normalisation, env validation, `/auth/me` contract fixture (shape of the backend Zod schema), snapshot parsing, status mapping, boleto conversion, notification link mapping.
- `EXPO_PUBLIC_USE_MOCKS=true` + Conta → Ferramentas de desenvolvimento → scenario (normal/empty/error/slow/offline) exercises every loading/empty/error/offline state without a backend.
- Against real APIs: fill `.env` (mocks off), sign in with a real consumer, and check each row of §3; the dev console logs every request's status and any contract mismatch.
