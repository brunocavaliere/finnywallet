create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text null,
  theme text null check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Profiles can view own data" on public.profiles;
drop policy if exists "Profiles can insert own data" on public.profiles;
drop policy if exists "Profiles can update own data" on public.profiles;
drop policy if exists "Profiles can delete own data" on public.profiles;

create policy "Profiles can view own data"
  on public.profiles
  for select
  using (user_id = auth.uid());

create policy "Profiles can insert own data"
  on public.profiles
  for insert
  with check (user_id = auth.uid());

create policy "Profiles can update own data"
  on public.profiles
  for update
  using (user_id = auth.uid());

create policy "Profiles can delete own data"
  on public.profiles
  for delete
  using (user_id = auth.uid());
