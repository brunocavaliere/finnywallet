import "server-only";

import { targetUpsertSchema, targetUpdateSchema } from "@/domains/portfolio/schemas";
import type { Target, TargetWithAsset } from "@/domains/portfolio/types";
import { getServerUserContext } from "@/domains/portfolio/server/session";

export async function listTargets(): Promise<TargetWithAsset[]> {
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("targets")
    .select("*, asset:assets(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return (data ?? []) as TargetWithAsset[];
}

export async function createTarget(input: unknown): Promise<Target> {
  const payload = targetUpsertSchema.parse(input);
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("targets")
    .upsert(
      {
        user_id: userId,
        asset_id: payload.asset_id,
        target_percent: payload.target_percent
      },
      { onConflict: "user_id,asset_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return data as Target;
}

export async function updateTarget(input: unknown): Promise<Target> {
  const payload = targetUpdateSchema.parse(input);
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("targets")
    .update({ target_percent: payload.target_percent })
    .eq("id", payload.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return data as Target;
}

export async function removeTarget(id: string) {
  const { supabase, userId } = await getServerUserContext();

  const { error } = await supabase
    .from("targets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }
}
