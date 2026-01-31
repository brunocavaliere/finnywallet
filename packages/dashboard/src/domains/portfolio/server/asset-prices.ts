import "server-only";

import type { AssetPrice } from "@/domains/portfolio/types";
import { createServerClient } from "@/lib/supabase/serverClient";

export async function listAssetPrices(
  tickers: string[]
): Promise<AssetPrice[]> {
  if (tickers.length === 0) {
    return [];
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("asset_prices")
    .select("*")
    .in("ticker", tickers);

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return (data ?? []) as AssetPrice[];
}
