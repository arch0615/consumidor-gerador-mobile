# Client demo checklist — ACVEL Consumidor (mobile)

Build: demo APK (`docs/release-checklist.md` §3.2) pointing to **homologation** (`api-acvel.souaiv.com` + Firebase `teste---00`), logged in with the homologation consumer test account (credentials provided separately — never shown in slides or recordings).

## How to show each state

| State | How to demonstrate |
|---|---|
| **Loading** | Every data screen shows a skeleton shaped like the final layout on first open (pull-to-refresh shows the spinner). Most visible on a slow network. |
| **Empty** | Live on the homologation account where data is empty (Benefícios rewards/statement, Meus resgates, indicados, Notificações). Any other screen: development build with mocks + **Conta › Ferramentas de desenvolvimento › Cenário "Sem dados (vazio)"**. |
| **Error** | Development build with mocks + scenario **"Erro do servidor"** (error card + "Tentar novamente"). Live: any backend failure shows the same pt-BR error state. |
| **Offline** | Airplane mode on a real device: offline banner, screens keep cached data, uncached screens show "Sem conexão" + retry. Mocks: scenario **"Sem conexão"**. |
| **Slow network** | Mocks: scenario **"Rede lenta"** (3.5 s per request). |

The developer tools (scenario switch, demo login) exist only in development builds with mocks (`__DEV__` + `EXPO_PUBLIC_USE_MOCKS=true`); they never appear in the demo APK.

⚠️ **Do not confirm on the shared test account during a demo** (they create real homologation records): *Excluir conta* (requests account deletion), *Quero ser gerador* (opens a request — only one at a time), *Trocar pontos* (when products exist), *Novo chamado*, *Nova unidade → Enviar*. Show the screens and stop at the confirmation dialog.

## Authentication

| Check | Expected | Loading | Empty | Error | ✓ |
|---|---|---|---|---|---|
| Login | e-mail + senha → Início | button "Entrando…" | — | wrong password → "E-mail ou senha incorretos"; offline → "Sem conexão…" | ☐ |
| Logout | Conta › Sair da conta → confirm → Login | button loading | — | — | ☐ |
| Session restore | kill the app, reopen → goes straight to Início | splash while restoring | — | expired session → back to Login with "Sua sessão expirou" | ☐ |
| Forgot password | Esqueci minha senha → e-mail sent | button loading | — | invalid e-mail → inline error | ☐ |

## Main flows (homologation account content in the "Live data" column)

| Flow | Where | Live data on the test account | Loading | Empty | Error | ✓ |
|---|---|---|---|---|---|---|
| Dashboard | Início | 1 active unit, next invoice (open test invoice, due 2026-10-16), savings series, energy month | dashboard skeleton | new consumer without units → "Cadastre sua primeira unidade" | error card + retry | ☐ |
| Units | Conta › Minhas unidades | 1 unit `ATIVA_COMPENSANDO`; detail with address/status | list skeleton | "Nenhuma unidade cadastrada" + cadastrar | error card + retry | ☐ |
| Bill OCR | Minhas unidades › Nova unidade › Conta de luz | upload a bill photo/PDF → "Lendo sua conta…" → fields pre-filled, "confira este campo" hints (stop before *Enviar*) | "Lendo sua conta…" card | — | "Não conseguimos ler a conta" + "Tentar ler novamente" / manual entry | ☐ |
| Documents | Conta › Documentos | 1 PDF (`hml-teste-app-mobile.pdf`, OUTRO, Pendente); tap → opens via share sheet | list skeleton | "Nenhum documento enviado" | error card + retry; open failure message | ☐ |
| Invoices | Faturas tab › detail | 11 invoices (paid, sem cobrança ACVEL, 1 open); paid ACVEL invoice → PDF opens | list skeleton | "Nenhuma fatura encontrada" | error card + retry | ☐ |
| Pix / Boleto | open invoice › Pagar fatura | "Pix/Boleto ainda não disponível" (backend Sisprime issue); paid invoice deep link → "Fatura já paga" | detail skeleton | no charge → "ainda não disponível" | error card + retry | ☐ |
| Economy | Economia tab | accumulated savings, 12 months, charts *Economia / Consumo / Custo*, indicators | dashboard skeleton | "Sua economia aparece aqui" | error card + retry | ☐ |
| Benefits | Benefícios tab | balance 0, referral link; Extrato and Meus resgates entries | dashboard skeleton | statement: "Nenhuma movimentação ainda"; resgates: "Nenhum resgate ainda" | error card + retry | ☐ |
| Reward detail | Benefícios › Recompensas › item | **no consumer products in homologation** → demo with mocks (detail, balance, "Trocar pontos", confirmation) | detail skeleton | catalogue empty (live) | "Recompensa indisponível" | ☐ |
| Referral | Benefícios › Regras e meus indicados | link + share, rules (1000 pts, 20/mês), 0 indicados | detail skeleton | "Quando alguém se cadastrar com o seu link, aparece aqui." | error card + retry | ☐ |
| Generator request | Conta › Quero ser gerador | benefits, rules, message field, "Quero ser gerador" (stop at confirmation) | detail skeleton | no previous requests → list hidden | "Não foi possível enviar" | ☐ |
| Notifications | sino no Início | 0 notifications | list skeleton | "Nenhuma notificação" | error card + retry; "Não foi possível marcar como lidas" | ☐ |
| Support | Conta › Ajuda e suporte | 1 ticket "[HML] Teste app mobile" with 1 message; WhatsApp hidden (not configured) | list skeleton | "Nenhum chamado aberto" | error card + retry | ☐ |
| Account deletion | Conta › Excluir conta | consequences + password + confirmation (**do not confirm**) | detail skeleton | — | wrong password → inline error | ☐ |
| Settings / legal | Conta › Configurações, Termos de uso e privacidade | notification preferences; portal terms page opens | list skeleton | — | save error message | ☐ |

## Demo script (≈ 10 min)

1. Login → Início (summary, next invoice, savings).
2. Faturas → paid ACVEL invoice → Baixar PDF.
3. Economia → switch Economia / Consumo / Custo; month detail.
4. Minhas unidades → detail → Nova unidade → upload bill → OCR pre-fill (cancel before sending).
5. Documentos → open the PDF.
6. Benefícios → Extrato, Meus resgates, Regras e meus indicados (share link).
7. Conta › Quero ser gerador (stop at confirmation).
8. Ajuda e suporte → open the ticket conversation.
9. Notificações, Configurações.
10. Kill and reopen (session restore) → Sair da conta.

## What cannot be shown live (and why)

| Item | Reason | Workaround |
|---|---|---|
| Pix QR / boleto line | Sisprime homologation rejects the registration (`nosso_numero`) | mocks show the QR + copia-e-cola / linha digitável screens |
| Reward detail / redemption | no consumer product in homologation | mocks |
| Referred people list, statement entries | no data on the test account | mocks |
| Minhas usinas | not implemented (needs generator account) | — |
| Push notifications | no backend device registration | in-app notifications |
