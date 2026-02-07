export type Asset = {
  id: string;
  user_id: string;
  ticker: string;
  name: string | null;
  asset_class: "acoes" | "fiis" | "etfs" | "tesouro" | "renda_fixa" | null;
  created_at: string;
};

export type Holding = {
  id: string;
  user_id: string;
  asset_id: string;
  qty: number | string;
  created_at: string;
  updated_at: string;
};

export type Target = {
  id: string;
  user_id: string;
  asset_id: string;
  target_percent: number | string;
  created_at: string;
  updated_at: string;
};

export type HoldingWithAsset = Holding & { asset: Asset };

export type TargetWithAsset = Target & { asset: Asset };

export type Quote = {
  id: string;
  user_id: string;
  asset_id: string;
  price: number | string;
  as_of: string;
  updated_at: string;
};

export type AssetPrice = {
  ticker: string;
  price: number | string;
  as_of: string;
  updated_at: string;
};

export type HoldingWithPrice = HoldingWithAsset & { price: AssetPrice | null };
