import { NextResponse } from "next/server";

import { getServerUserContext } from "@/domains/portfolio/server/session";

const BRAPI_BASE_URL = "https://brapi.dev/api/quote";

function getCacheMinutes() {
  const rawValue = process.env.QUOTES_REFRESH_MINUTES ?? "60";
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 60;
}

type QuoteResult = {
  symbol?: string;
  regularMarketPrice?: number;
  price?: number;
  regularMarketTime?: number | string;
};

function resolveAsOf(time: QuoteResult["regularMarketTime"]): string {
  if (typeof time === "number" && Number.isFinite(time)) {
    const millis = time > 1_000_000_000_000 ? time : time * 1000;
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (typeof time === "string" && time.trim() !== "") {
    const date = new Date(time);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

export async function POST() {
  try {
    const apiKey = process.env.BRAPI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "BRAPI_API_KEY não configurada." },
        { status: 500 }
      );
    }

    const { supabase, userId } = await getServerUserContext();

    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("id, ticker")
      .eq("user_id", userId);

    if (assetsError) {
      throw assetsError;
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({ updated: 0, skipped: true });
    }

    const { data: existingQuotes, error: quotesError } = await supabase
      .from("quotes")
      .select("asset_id, updated_at")
      .eq("user_id", userId);

    if (quotesError) {
      throw quotesError;
    }

    const existingByAsset = new Map(
      (existingQuotes ?? []).map((quote) => [quote.asset_id, quote.updated_at])
    );

    const missingQuotes = assets.filter(
      (asset) => !existingByAsset.has(asset.id)
    );

    const latestUpdatedAt = (existingQuotes ?? []).reduce<string | null>(
      (latest, quote) => {
        if (!latest) {
          return quote.updated_at;
        }
        return latest > quote.updated_at ? latest : quote.updated_at;
      },
      null
    );

    const cacheMinutes = getCacheMinutes();
    if (missingQuotes.length === 0 && latestUpdatedAt) {
      const diffMinutes =
        (Date.now() - new Date(latestUpdatedAt).getTime()) / 60000;
      if (diffMinutes < cacheMinutes) {
        return NextResponse.json({ updated: 0, skipped: true });
      }
    }

    const tickers = assets.map((asset) => asset.ticker).join(",");
    const url = `${BRAPI_BASE_URL}/${encodeURIComponent(
      tickers
    )}?token=${apiKey}`;

    const response = await fetch(url, { next: { revalidate: 0 } });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Falha ao consultar preços." },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as { results?: QuoteResult[] };
    const results = payload.results ?? [];

    const quotesBySymbol = new Map(
      results
        .filter((result) => result.symbol)
        .map((result) => [result.symbol as string, result])
    );

    const rows = [] as {
      user_id: string;
      asset_id: string;
      price: number;
      as_of: string;
    }[];
    const errors: string[] = [];

    assets.forEach((asset) => {
      const result = quotesBySymbol.get(asset.ticker);
      const price = result?.regularMarketPrice ?? result?.price;
      if (!price || Number.isNaN(price)) {
        errors.push(`Sem preço para ${asset.ticker}`);
        console.warn(`Sem preço para ${asset.ticker}`);
        return;
      }

      const asOf = resolveAsOf(result?.regularMarketTime);

      rows.push({
        user_id: userId,
        asset_id: asset.id,
        price,
        as_of: asOf,
      });
    });

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("quotes")
        .upsert(rows, { onConflict: "user_id,asset_id" });

      if (upsertError) {
        throw upsertError;
      }
    }

    return NextResponse.json({ updated: rows.length, errors });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Não foi possível atualizar os preços." },
      { status: 500 }
    );
  }
}
