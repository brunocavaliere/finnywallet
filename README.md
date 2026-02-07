# Finny Wallet

Finny Wallet e uma aplicacao web para acompanhamento de carteira e rebalanceamento, com autenticacao e persistencia via Supabase. O projeto e um monorepo com dashboard (Next.js) e API (Bun + Hono), pensado para uso academico no TCC.

**Stack**
- Bun (runtime e workspace)
- Next.js 14 (App Router)
- Hono (API)
- Supabase (Postgres + Auth + RLS)
- Tailwind CSS

**Estrutura do repositorio**
- `packages/dashboard`: frontend web e rotas de API do Next.
- `packages/api`: API leve para jobs e ingestao de dados.
- `packages/shared`: tipos e utilitarios compartilhados.
- `supabase/migrations`: schema e politicas RLS.
- `data/b3`: base e extracoes de ativos da B3.
- `scripts/b3`: utilitarios para preparar dados da B3.

**Requisitos**
- Bun instalado.
- Node 22 (recomendado via `nvm use 22`).
- Projeto Supabase configurado.

**Setup rapido**
1. Instale dependencias com `bun install`.
2. Configure variaveis de ambiente em `packages/dashboard/.env.local` e `packages/api/.env` (ou exporte no shell).
3. No Supabase, desative confirmacao de email em Authentication -> Providers -> Email -> Confirm email.
4. Inicie o ambiente com `bun run dev`.
5. Acesse `http://localhost:3000`.

**Variaveis de ambiente**

Dashboard (`packages/dashboard/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL` (obrigatoria)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (obrigatoria)
- `BRAPI_API_KEY` (obrigatoria para atualizar precos de ativos)
- `JOB_SECRET` (obrigatoria para disparar o job do Tesouro)
- `API_URL` (opcional, base da API externa. Default `http://localhost:3001`)
- `QUOTES_REFRESH_MINUTES` (opcional, cache de cotacoes em minutos. Default 60)

API (`packages/api/.env` ou variaveis exportadas)
- `SUPABASE_URL` (obrigatoria)
- `SUPABASE_SERVICE_ROLE_KEY` (obrigatoria)
- `JOB_SECRET` (obrigatoria)
- `PORT` (opcional, default 3001)

**Comandos principais**
- `bun run dev`: dashboard + api.
- `bun run dev:dashboard`: somente dashboard.
- `bun run dev:api`: somente API.
- `bun run typecheck`: checagem de tipos em todos os pacotes.

**Rotas e paginas**

Dashboard (paginas)
- `/` landing.
- `/login`, `/signup` autenticacao.
- `/dashboard` visao geral da carteira.
- `/holdings` posicoes.
- `/targets` metas de alocacao.
- `/rebalance` rebalanceamento.
- `/profile` preferencias do usuario.

Dashboard (API interna do Next)
- `POST /api/quotes/refresh`: atualiza precos via BRAPI.
- `POST /api/treasury/refresh`: aciona job da API para Tesouro Direto.
- `GET /api/treasury-titles`: lista titulos do Tesouro para autocomplete.
- `GET /api/b3-assets`: busca ativos da B3 por ticker ou nome.

API (Bun + Hono)
- `GET /health`: healthcheck simples.
- `POST /jobs/treasury-refresh`: baixa CSV do Tesouro e grava em `treasury_prices`.

**Fluxos de dados**
- Cotacoes (B3): o dashboard consulta a BRAPI e grava em `asset_prices`.
- Tesouro Direto: o dashboard chama a API, a API baixa o CSV oficial e faz upsert em `treasury_prices`.
- Ativos B3: um CSV oficial e filtrado em `data/b3`, preparado por script.

**Banco de dados (Supabase)**
As migracoes estao em `supabase/migrations` e criam as tabelas:
- `assets`, `holdings`, `targets`, `quotes`: carteira do usuario.
- `profiles`: preferencias do usuario.
- `asset_prices`: precos recentes por ticker.
- `b3_assets`: catalogo de ativos da B3.
- `treasury_prices`: precos do Tesouro Direto.

As tabelas possuem RLS e politicas para garantir acesso apenas ao usuario autenticado.

**Scripts uteis**
Para gerar a base filtrada da B3, execute `node scripts/b3/parse-b3-assets.js`.

**Troubleshooting**
Para verificar portas em uso, rode `lsof -nP -iTCP:3000 -sTCP:LISTEN` e `lsof -nP -iTCP:3001 -sTCP:LISTEN`.
Se a UI nao subir, verifique variaveis de ambiente e se a API esta rodando.
