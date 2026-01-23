"use server";

import { revalidatePath } from "next/cache";

import { createTarget, removeTarget } from "@/domains/portfolio/server/targets";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function upsertTargetAction(input: {
  asset_id: string;
  target_percent: number;
}): Promise<ActionResult> {
  try {
    await createTarget(input);
    revalidatePath("/targets");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar a meta." };
  }
}

export async function removeTargetAction(id: string): Promise<ActionResult> {
  try {
    await removeTarget(id);
    revalidatePath("/targets");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível remover a meta." };
  }
}
