create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  price numeric not null,
  as_of timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create trigger quotes_set_updated_at
before update on public.quotes
for each row execute function public.set_updated_at();

alter table public.quotes enable row level security;

create policy "Quotes can view own data"
  on public.quotes
  for select
  using (user_id = auth.uid());

create policy "Quotes can insert own data"
  on public.quotes
  for insert
  with check (user_id = auth.uid());

create policy "Quotes can update own data"
  on public.quotes
  for update
  using (user_id = auth.uid());

create policy "Quotes can delete own data"
  on public.quotes
  for delete
  using (user_id = auth.uid());
