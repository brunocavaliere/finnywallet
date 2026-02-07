import "server-only";

import {
  assetCreateSchema,
  assetUpdateSchema,
  tickerSchema
} from "@/domains/portfolio/schemas";
import type { Asset } from "@/domains/portfolio/types";
import { getServerUserContext } from "@/domains/portfolio/server/session";

function inferAssetClass(params: {
  assetClass: string | null;
  ticker: string;
  b3Category?: string | null;
}) {
  const { assetClass, ticker, b3Category } = params;
  if (assetClass) {
    return assetClass;
  }
  if (ticker.startsWith("TD:")) {
    return "tesouro";
  }
  const category = b3Category?.toUpperCase() ?? "";
  if (category.includes("FII") || category.includes("FUND")) {
    return "fiis";
  }
  if (category.startsWith("ETF")) {
    return "etfs";
  }
  if (category === "SHARES" || category === "BDR" || category === "UNIT") {
    return "acoes";
  }
  return null;
}

export async function listAssets(): Promise<Asset[]> {
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return data ?? [];
}

export async function createAsset(input: unknown): Promise<Asset> {
  const payload = assetCreateSchema.parse(input);
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("assets")
    .insert({
      user_id: userId,
      ticker: payload.ticker,
      name: payload.name ?? null,
      asset_class: payload.asset_class ?? null
    })
    .select("*")
    .single();

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return data as Asset;
}

export async function findAssetByTicker(ticker: string): Promise<Asset | null> {
  const payload = tickerSchema.parse(ticker);
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", userId)
    .eq("ticker", payload)
    .maybeSingle();

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return (data as Asset | null) ?? null;
}

export async function getOrCreateAsset(input: unknown): Promise<Asset> {
  const payload = assetCreateSchema.parse(input);
  const { supabase, userId } = await getServerUserContext();
  let resolvedName = payload.name ?? null;
  let resolvedClass = payload.asset_class ?? null;
  let b3Category: string | null = null;

  if (!resolvedName) {
    const { data: b3Assets } = await supabase
      .from("b3_assets")
      .select("ticker, name, category")
      .ilike("ticker", `${payload.ticker}%`)
      .limit(5);

    const match = (b3Assets ?? []).find((asset) =>
      new RegExp(`^${payload.ticker}$`, "i").test(asset.ticker)
    );
    resolvedName = (match?.name as string | null) ?? null;
    b3Category = (match?.category as string | null) ?? null;
  }

  resolvedClass = inferAssetClass({
    assetClass: resolvedClass,
    ticker: payload.ticker,
    b3Category
  });

  const { data: existing, error: existingError } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", userId)
    .eq("ticker", payload.ticker)
    .maybeSingle();

  if (existingError) {
    throw Object.assign(new Error(existingError.message), {
      code: existingError.code
    });
  }

  if (existing) {
    if (
      (resolvedName && resolvedName !== existing.name) ||
      (resolvedClass && resolvedClass !== existing.asset_class)
    ) {
      const { data: updated, error: updateError } = await supabase
        .from("assets")
        .update({
          name: resolvedName,
          asset_class: resolvedClass ?? existing.asset_class
        })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (updateError) {
        throw Object.assign(new Error(updateError.message), {
          code: updateError.code
        });
      }

      return updated as Asset;
    }

    return existing as Asset;
  }

  return createAsset({
    ...payload,
    name: resolvedName,
    asset_class: resolvedClass
  });
}

export async function updateAsset(input: unknown): Promise<Asset> {
  const payload = assetUpdateSchema.parse(input);
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("assets")
    .update({
      ticker: payload.ticker,
      name: payload.name ?? null,
      asset_class: payload.asset_class ?? null
    })
    .eq("id", payload.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return data as Asset;
}

export async function removeAsset(id: string) {
  const { supabase, userId } = await getServerUserContext();

  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }
}
