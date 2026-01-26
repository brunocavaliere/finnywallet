"use server";

import { revalidatePath } from "next/cache";

import { upsertTargets } from "@/domains/portfolio/server/targets";

type ActionResult = { ok: true } | { ok: false; error: string };

type TargetInput = {
  asset_id: string;
  target_percent: number;
};

export async function saveTargetsAction(
  input: TargetInput[]
): Promise<ActionResult> {
  try {
    await upsertTargets(input);
    revalidatePath("/targets");
    revalidatePath("/rebalance");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar as metas." };
  }
}
