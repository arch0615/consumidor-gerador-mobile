# Backend requirements — ACVEL Consumidor (mobile)

Open items the backend / client teams need to provide or fix so the mobile app can be fully demonstrated and released. Evidence and history: `docs/live-api-validation.md` (section numbers in brackets). Environment: homologation = Firebase `teste---00` + `https://api-acvel.souaiv.com/api/{auth,business,rateio}`.

Priority: **P1** blocks demo/release of an existing app feature · **P2** needed to validate a feature with real data · **P3** improvement / documentation.

## 1. Test data and accounts

| # | Need | Why | Priority |
|---|---|---|---|
| 1.1 | **Generator test account** (consumer with `is_generator=true`) with at least one plant (usina) and some generation/payment history | build and validate **Minhas usinas** (portal `/minhas-usinas*`, ~30 services: plants, onboarding, performance, revenue, payments, alerts); also shows the "Seu perfil de gerador está ativo" state of *Quero ser gerador* | P2 |
| 1.2 | **Marketplace products**: ≥ 1 active product `tipo_produto` `PRODUTO_FISICO` or `PRODUTO_DIGITAL`, `ativo=true`, `estoque_disponivel > 0`, `tipo_publico=CONSUMIDOR`, `preco_pontos > 0` | reward detail, redemption (`POST /v1/pedidos`), "Meus resgates", cancel (`POST /v1/pedidos/{id}/cancel`) — homologation catalogue is empty | P2 |
| 1.3 | **Points** on the consumer test account (≥ the product price) and a few statement entries | redeem + statement screens | P2 |
| 1.4 | **Referral data**: at least one consumer registered with the test account's referral link (ideally one `ATIVO` with reward, one `EM_ANALISE`) | "Meus indicados" list (masked names), reward statuses | P2 |
| 1.5 | Clarify the referral flag: `GET /v1/consumidores/me/indicacao` returns `programaAtivo=false` (config `INDICACAO.REFERRAL_ENABLED=false`) | the portal ignores the flag, so does the app — confirm intended behaviour | P3 |
| 1.6 | Notifications for the test account (one per category: fatura, economia, benefícios, suporte, cadastro) | demo of the notification list, deep links and read/unread | P3 |

## 2. Pix / boleto (Sisprime) — P1

| Item | Detail |
|---|---|
| Problem | Every Sisprime registration in homologation is rejected: `Entrada Rejeitada: O campo [Nosso Número] não pode se repetir.` — the backend generates `nosso_numero = 00000000001`, already used in the Sisprime sandbox; retries reuse the same number [§10.2, §10.6] |
| Impact | No Pix QR / copia-e-cola and no digitable line exist in homologation; the app (read-only for charges) shows "Pix/Boleto ainda não disponível" |
| Needed | Fix the `nosso_numero` sequence (or reset the sandbox), then re-register the open test invoice `9b4f3366-7b70-4566-a7da-d46017dc3837` (competência 2025-06, due 2026-10-16) |
| Related | `POST /v1/pagamentos/cobrancas` returns **500** on a rejected registration (should be 4xx/502 with the gateway message); `pix_expira_em` is null for the hybrid boleto; the exposed charge uses the invoice id and `GET /v1/pagamentos/cobrancas/{id}` returns 404 |
| Data consistency | historical paid invoices (`PAGA`) keep a `BOLETO` charge `PENDENTE` [§10.2 "Backend mismatch"]; settle or cancel superseded charges |

## 3. Push notifications — P2 (if push is in scope)

| Item | Detail |
|---|---|
| Missing | device-registration endpoint (e.g. `POST /v1/notificacoes/dispositivos` with FCM/APNs token, platform, app version; `DELETE` on logout) and push sending from the notification service |
| App side | in-app notifications are complete; notification payloads already carry portal links that the app maps to screens (deep links) |
| Also | APNs key / FCM configuration in the Firebase project used for production |

## 4. Permissions and auth-api — P1/P2

| # | Item | Priority |
|---|---|---|
| 4.1 | Role `consumidor_basico` has **no `suporte` permission** → consumers get 403 on support tickets. Add `suporte READ:OWN` + `CREATE:OWN`. The homologation test user works only through the temporary role `consumidor_teste_suporte` [§9.4] (remove it after the fix) | P1 |
| 4.2 | Legacy auth-api answers **401 with the Prisma/database error text** during a database outage [§10.6]; clients treat 401 as an expired session. Return 503 without internal details (the app now tolerates it, but other clients do not) | P2 |
| 4.3 | `GET` / `DELETE /v1/auth/account/delete-request` missing (no status lookup / cancel of a deletion request) [§7.3] | P2 |
| 4.4 | `/v1/auth/me.onboarding_completed=false` for approved consumers (app derives the state from the consumer record, like the portal) [§7.1 M1] | P3 |
| 4.5 | Admin `GET /v1/support/tickets` returns 0 while consumer tickets exist; `GET /v1/support/tickets/{unknown}` returns 200 with an empty body instead of 404 [§9.8] | P3 |
| 4.6 | Production Firebase project `acvel-prod`: register the Android app and iOS app `com.acvel.app` and provide `google-services.json` + `GoogleService-Info.plist` | P1 (release) |

## 5. Billing data quality — P2

| Item | Detail |
|---|---|
| `total_sem_acvel` / `total_com_acvel` = 0 | on ACVEL months of the rateio snapshot (app falls back to the portal's estimate) [§7.1 M4] |
| Digital Grid invoices | `GET /v1/faturas/{id}` → 404 and `/v1/faturas-distribuidora/{id}/download` → 403 for the consumer [§7.1] |
| `paga_em` | null on paid invoices in `faturas/me` → payment history without date/method |

## 6. Swagger / API documentation gaps — P3

| Gap | Detail |
|---|---|
| Auth API | no Swagger for the legacy auth-api (`/v1/auth/me`, register, profile, password, deletion) |
| Missing response schemas | `/v1/pedidos` (list), `/v1/pedidos/me/context`, `/v1/pontos/me`, `/v1/consumidores/me/indicacao`, `/v1/consumidores/me/indicados`, `/v1/gerador-interest-requests/me`, `/v1/consumidores/me/rateio-snapshot`, notifications (list, count, preferences), support (tickets list `{items,total,page,pageSize}`, ticket, messages), documents list, signed URL, WhatsApp config, produtos |
| Undocumented enums | generator-request status (open / contacted / granted / closed?), marketplace order status (`PENDENTE`, `CONFIRMADO`, `EM_SEPARACAO`, `ENVIADO`, `ENTREGUE`, `REPROVADO`, `CANCELADO`, `ESTORNADO`?), support ticket status meaning of `AGUARDANDO` (waiting for support or for the client?) |
| Contracts to confirm | `GET /v1/pedidos` is scoped to the authenticated consumer; `signed_url` is API-relative and requires the Bearer token (not a public pre-signed URL); item fields assumed from the portal for orders (`produto_id, produto.nome, pontos_gastos/pontos_solicitados, status, created_at, version`), referred people (`id, nome, status, createdAt, rewardPoints`) and generator requests (`id, status, created_at, message`) [§15.3] |
| Error envelope | mixed formats (canonical `{error:{code,…}}` vs. NestJS `{message, error, statusCode}`); 401 used for "user not provisioned" (should be 403 `ACCOUNT_NOT_PROVISIONED`) |

## 7. Homologation records created during validation (for cleanup)

| Record | Id | Reverse |
|---|---|---|
| Role `consumidor_teste_suporte` (assigned to the test user) | `b502c195-d5d2-4fa0-a7cc-ff0dac658bd6` | `DELETE /v1/users/{userId}/roles/{roleId}`, then `DELETE /v1/roles/{roleId}` — after 4.1 |
| Support ticket "[HML] Teste app mobile" | `35ff4e06-01ad-4843-97a7-157e7d92f08e` | `PATCH …/status RESOLVIDO` or DB removal |
| Document `hml-teste-app-mobile.pdf` | `3ee73f0c-bfbb-4d42-9fca-191a0c63657f` | `POST /v1/documentos/{id}/reprovar` or DB removal |
| Open test invoice (W4) | `9b4f3366-7b70-4566-a7da-d46017dc3837` | keep for the Pix/boleto retest (§2) or `POST /v1/faturas/{id}/cancelar` |
