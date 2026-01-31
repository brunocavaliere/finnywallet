create table if not exists public.asset_prices (
  ticker text primary key,
  price numeric not null,
  as_of timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger asset_prices_set_updated_at
before update on public.asset_prices
for each row execute function public.set_updated_at();

alter table public.asset_prices enable row level security;

create policy "Asset prices can view" on public.asset_prices
  for select
  using (auth.uid() is not null);

create policy "Asset prices can insert" on public.asset_prices
  for insert
  with check (auth.uid() is not null);

create policy "Asset prices can update" on public.asset_prices
  for update
  using (auth.uid() is not null);

create policy "Asset prices can delete" on public.asset_prices
  for delete
  using (auth.uid() is not null);
