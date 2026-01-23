# Finny Wallet Dashboard

## Environment variables

Copy the root example file and configure Supabase credentials:

```bash
cp ../../.env.example ../../.env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Disable email confirmation in Supabase for password-based auth:

- Supabase project → Authentication → Providers → Email → **Confirm email** disabled.

## Development

From the repo root:

```bash
bun run dev:dashboard
```
