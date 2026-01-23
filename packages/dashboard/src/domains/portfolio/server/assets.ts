import "server-only";

import { assetCreateSchema, assetUpdateSchema } from "@/domains/portfolio/schemas";
import type { Asset } from "@/domains/portfolio/types";
import { getServerUserContext } from "@/domains/portfolio/server/session";

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
      name: payload.name ?? null
    })
    .select("*")
    .single();

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return data as Asset;
}

export async function updateAsset(input: unknown): Promise<Asset> {
  const payload = assetUpdateSchema.parse(input);
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("assets")
    .update({
      ticker: payload.ticker,
      name: payload.name ?? null
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
