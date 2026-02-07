alter table public.assets
add column if not exists asset_class text null;

alter table public.assets
add constraint assets_asset_class_check
check (asset_class in ('acoes', 'fiis', 'etfs', 'tesouro', 'renda_fixa'))
not valid;

alter table public.assets
validate constraint assets_asset_class_check;
