create table if not exists public.treasury_prices (
  title_type text not null,
  maturity_date date not null,
  base_date date not null,
  buy_rate numeric(10,6) null,
  sell_rate numeric(10,6) null,
  buy_price numeric(18,8) null,
  sell_price numeric(18,8) null,
  base_price numeric(18,8) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (title_type, maturity_date, base_date)
);

create index if not exists treasury_prices_base_date_idx
  on public.treasury_prices (base_date desc);

create trigger treasury_prices_set_updated_at
before update on public.treasury_prices
for each row execute function public.set_updated_at();

alter table public.treasury_prices enable row level security;

create policy "Treasury prices can view"
  on public.treasury_prices
  for select
  using (auth.uid() is not null);
