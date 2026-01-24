"use server";

import { revalidatePath } from "next/cache";

import { holdingCreateSchema } from "@/domains/portfolio/schemas";
import {
  findAssetByTicker,
  getOrCreateAsset
} from "@/domains/portfolio/server/assets";
import {
  createHolding,
  removeHolding,
  removeHoldingByAssetId
} from "@/domains/portfolio/server/holdings";
type ActionResult = { ok: true } | { ok: false; error: string };

export async function upsertHoldingAction(input: {
  ticker: string;
  name?: string | null;
  qty: number;
}): Promise<ActionResult> {
  try {
    const payload = holdingCreateSchema.parse(input);
    const asset =
      payload.qty === 0
        ? await findAssetByTicker(payload.ticker)
        : await getOrCreateAsset({
            ticker: payload.ticker,
            name: payload.name
          });

    if (payload.qty === 0) {
      if (asset) {
        await removeHoldingByAssetId(asset.id);
      }
    } else if (asset) {
      await createHolding({ asset_id: asset.id, qty: payload.qty });
    }
    revalidatePath("/holdings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar a posição." };
  }
}

export async function removeHoldingAction(id: string): Promise<ActionResult> {
  try {
    await removeHolding(id);
    revalidatePath("/holdings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível remover a posição." };
  }
}
