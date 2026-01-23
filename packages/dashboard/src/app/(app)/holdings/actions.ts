"use server";

import { revalidatePath } from "next/cache";

import {
  createHolding,
  removeHolding,
  removeHoldingByAssetId
} from "@/domains/portfolio/server/holdings";
type ActionResult = { ok: true } | { ok: false; error: string };

export async function upsertHoldingAction(input: {
  asset_id: string;
  qty: number;
}): Promise<ActionResult> {
  try {
    if (input.qty === 0) {
      await removeHoldingByAssetId(input.asset_id);
    } else {
      await createHolding(input);
    }
    revalidatePath("/holdings");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar a posição." };
  }
}

export async function removeHoldingAction(id: string): Promise<ActionResult> {
  try {
    await removeHolding(id);
    revalidatePath("/holdings");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível remover a posição." };
  }
}
