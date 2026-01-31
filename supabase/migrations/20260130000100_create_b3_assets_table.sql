create table if not exists public.b3_assets (
  ticker text primary key,
  asset_code text null,
  name text null,
  segment text null,
  market text null,
  category text null,
  isin text null,
  cfi text null,
  lot_size integer null,
  currency text null,
  spec_code text null,
  institution_name text null,
  governance text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger b3_assets_set_updated_at
before update on public.b3_assets
for each row execute function public.set_updated_at();

alter table public.b3_assets enable row level security;

create policy "B3 assets can view"
  on public.b3_assets
  for select
  using (auth.uid() is not null);
