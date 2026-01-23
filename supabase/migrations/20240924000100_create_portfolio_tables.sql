create extension if not exists "pgcrypto";

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  name text null,
  created_at timestamptz not null default now(),
  unique (user_id, ticker)
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  qty numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create table if not exists public.targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  target_percent numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger holdings_set_updated_at
before update on public.holdings
for each row execute function public.set_updated_at();

create trigger targets_set_updated_at
before update on public.targets
for each row execute function public.set_updated_at();

alter table public.assets enable row level security;
alter table public.holdings enable row level security;
alter table public.targets enable row level security;

create policy "Assets can view own data"
  on public.assets
  for select
  using (user_id = auth.uid());

create policy "Assets can insert own data"
  on public.assets
  for insert
  with check (user_id = auth.uid());

create policy "Assets can update own data"
  on public.assets
  for update
  using (user_id = auth.uid());

create policy "Assets can delete own data"
  on public.assets
  for delete
  using (user_id = auth.uid());

create policy "Holdings can view own data"
  on public.holdings
  for select
  using (user_id = auth.uid());

create policy "Holdings can insert own data"
  on public.holdings
  for insert
  with check (user_id = auth.uid());

create policy "Holdings can update own data"
  on public.holdings
  for update
  using (user_id = auth.uid());

create policy "Holdings can delete own data"
  on public.holdings
  for delete
  using (user_id = auth.uid());

create policy "Targets can view own data"
  on public.targets
  for select
  using (user_id = auth.uid());

create policy "Targets can insert own data"
  on public.targets
  for insert
  with check (user_id = auth.uid());

create policy "Targets can update own data"
  on public.targets
  for update
  using (user_id = auth.uid());

create policy "Targets can delete own data"
  on public.targets
  for delete
  using (user_id = auth.uid());
