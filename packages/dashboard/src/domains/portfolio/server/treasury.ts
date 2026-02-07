import "server-only";

import type { AssetPrice } from "@/domains/portfolio/types";
import { getServerUserContext } from "@/domains/portfolio/server/session";

type TreasuryPriceRow = {
  title_type: string;
  maturity_date: string;
  base_date: string;
  buy_price: number | string | null;
  sell_price: number | string | null;
  base_price: number | string | null;
};

function parseTreasuryTicker(ticker: string) {
  const [prefix, titleType, maturityDate] = ticker.split(":");
  if (prefix !== "TD" || !titleType || !maturityDate) {
    return null;
  }
  return { titleType, maturityDate };
}

function resolveTreasuryPrice(row: TreasuryPriceRow) {
  const price =
    row.sell_price ?? row.buy_price ?? row.base_price ?? null;
  if (price === null) {
    return null;
  }
  const numeric = Number(price);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeTitleType(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export async function listTreasuryPricesByTickers(
  tickers: string[]
): Promise<Map<string, AssetPrice>> {
  const treasuryTickers = tickers.filter((ticker) => ticker.startsWith("TD:"));
  if (treasuryTickers.length === 0) {
    return new Map();
  }

  const { supabase } = await getServerUserContext();

  const { data: latestBase } = await supabase
    .from("treasury_prices")
    .select("base_date")
    .order("base_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestBase?.base_date) {
    return new Map();
  }

  const parsed = treasuryTickers
    .map((ticker) => ({ ticker, parsed: parseTreasuryTicker(ticker) }))
    .filter((item) => item.parsed !== null) as {
    ticker: string;
    parsed: { titleType: string; maturityDate: string };
  }[];

  if (parsed.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("treasury_prices")
    .select(
      "title_type, maturity_date, base_date, buy_price, sell_price, base_price"
    )
    .eq("base_date", latestBase.base_date);

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  const map = new Map<string, AssetPrice>();
  const lookup = new Map<string, string>();
  parsed.forEach(({ ticker, parsed: { titleType, maturityDate } }) => {
    const key = `${normalizeTitleType(titleType)}:${maturityDate}`;
    lookup.set(key, ticker);
  });

  (data ?? []).forEach((row) => {
    const key = `${normalizeTitleType(row.title_type)}:${row.maturity_date}`;
    const ticker = lookup.get(key);
    if (!ticker) {
      return;
    }
    const price = resolveTreasuryPrice(row as TreasuryPriceRow);
    if (price === null) {
      return;
    }
    const asOf = new Date(row.base_date).toISOString();
    map.set(ticker, {
      ticker,
      price,
      as_of: asOf,
      updated_at: asOf
    });
  });

  return map;
}
