"use server";

import { revalidatePath } from "next/cache";

import {
  removeTargetsNotIn,
  upsertTargets
} from "@/domains/portfolio/server/targets";

type ActionResult = { ok: true } | { ok: false; error: string };

type TargetInput = {
  asset_id: string;
  target_percent: number;
};

export async function saveTargetsAction(
  input: TargetInput[]
): Promise<ActionResult> {
  try {
    const normalized =
      Array.isArray(input) && Array.isArray(input[0])
        ? (input as TargetInput[][]).flat()
        : input;
    const rounded = normalized.map((item) => ({
      ...item,
      target_percent: Number(Number(item.target_percent).toFixed(2))
    }));
    const assetIds = rounded.map((target) => target.asset_id);
    await removeTargetsNotIn(assetIds);
    await upsertTargets(rounded);
    revalidatePath("/targets");
    revalidatePath("/rebalance");
    return { ok: true };
  } catch (error) {
    console.error("saveTargetsAction error:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível salvar as metas.";
    return { ok: false, error: message };
  }
}
