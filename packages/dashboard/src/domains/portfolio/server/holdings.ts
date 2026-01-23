import "server-only";

import { holdingUpsertSchema, holdingUpdateSchema } from "@/domains/portfolio/schemas";
import type { Holding, HoldingWithAsset } from "@/domains/portfolio/types";
import { getServerUserContext } from "@/domains/portfolio/server/session";

export async function listHoldings(): Promise<HoldingWithAsset[]> {
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("holdings")
    .select("*, asset:assets(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return (data ?? []) as HoldingWithAsset[];
}

export async function createHolding(input: unknown): Promise<Holding> {
  const payload = holdingUpsertSchema.parse(input);
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("holdings")
    .upsert(
      {
        user_id: userId,
        asset_id: payload.asset_id,
        qty: payload.qty
      },
      { onConflict: "user_id,asset_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return data as Holding;
}

export async function updateHolding(input: unknown): Promise<Holding> {
  const payload = holdingUpdateSchema.parse(input);
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("holdings")
    .update({ qty: payload.qty })
    .eq("id", payload.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return data as Holding;
}

export async function removeHolding(id: string) {
  const { supabase, userId } = await getServerUserContext();

  const { error } = await supabase
    .from("holdings")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }
}

export async function removeHoldingByAssetId(assetId: string) {
  const { supabase, userId } = await getServerUserContext();

  const { error } = await supabase
    .from("holdings")
    .delete()
    .eq("asset_id", assetId)
    .eq("user_id", userId);

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }
}
