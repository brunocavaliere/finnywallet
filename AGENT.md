# Finny Wallet – AI Agent Context

## Project Overview
Finny Wallet is a Bun monorepo for a personal finance app focused on portfolio allocation
and rebalancing for Brazilian assets (B3).

Phase 1 goal: a simple and friendly portfolio balancer using price data via brapi.dev.

Finny Wallet aims to make portfolio balance easy, clear and approachable.

## Monorepo Structure
- /packages/dashboard: Next.js (App Router) UI using Tailwind + shadcn/ui
- /packages/api: Bun-run Node API (Hono) for internal endpoints and integrations
- /packages/shared: Shared TS utilities, zod schemas, and money helpers

## Tech Stack
- Bun workspaces
- TypeScript (strict)
- Next.js App Router
- Tailwind CSS + shadcn/ui
- Supabase Auth + Postgres (no ORM)
- Market data: brapi.dev (Brazil only)

## Product Scope (Phase 1)
- Email + password auth (no email confirmation)
- Manual holdings input (qty)
- Target allocation per asset (%)
- Rebalancing suggestions (buy/sell amounts) based on latest stored prices
- Prices: baseline EOD + manual refresh (cached), not realtime trading

## Architectural Decisions
- Postgres (Supabase) is the source of truth
- No Prisma/Drizzle/ORM
- SQL migrations in /supabase/migrations (applied manually via Supabase SQL Editor for now)
- Prefer simple incremental changes over large rewrites
- Avoid unnecessary dependencies

## UI/UX Guidelines
- Minimal, clean UI inspired by ChatGPT
- Consistent shadcn usage (Card, Table, Tabs, Dialog, Sheet)
- Prefer clarity over decoration

## AI Instructions
When generating code:
- Respect this document and any package-level AGENT.md
- Don’t introduce new libraries unless explicitly requested
- Keep code readable, typed, and maintainable
