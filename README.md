# Finny Wallet

Finny Wallet is a Bun-based monorepo for a clean, minimal portfolio allocation dashboard and API.

## Prerequisites

- [Bun](https://bun.sh) installed locally.

## Installation

```bash
bun install
```

## Environment variables

Copy the example env file and fill in values as needed:

```bash
cp .env.example .env
```

## Development

Run the dashboard and API together:

```bash
bun run dev
```

Or run each package separately:

```bash
bun run dev:dashboard
bun run dev:api
```

## Type checking

```bash
bun run typecheck
```
