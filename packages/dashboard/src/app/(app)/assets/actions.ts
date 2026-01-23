"use server";

import { revalidatePath } from "next/cache";

import { createAsset, listAssets, removeAsset, updateAsset } from "@/domains/portfolio/server/assets";
import { createHolding } from "@/domains/portfolio/server/holdings";
import { createTarget } from "@/domains/portfolio/server/targets";

const DUPLICATE_CODE = "23505";

type ActionResult = { ok: true } | { ok: false; error: string };

const exampleAssets = [
  { ticker: "PETR4", name: "Petrobras" },
  { ticker: "VALE3", name: "Vale" },
  { ticker: "IVVB11", name: "iShares S&P 500" }
];

export async function createAssetAction(input: unknown): Promise<ActionResult> {
  try {
    await createAsset(input);
    revalidatePath("/assets");
    return { ok: true };
  } catch (error) {
    const message =
      (error as { code?: string }).code === DUPLICATE_CODE
        ? "Esse ticker já existe para a sua conta."
        : "Não foi possível criar o ativo.";
    return { ok: false, error: message };
  }
}

export async function updateAssetAction(input: unknown): Promise<ActionResult> {
  try {
    await updateAsset(input);
    revalidatePath("/assets");
    revalidatePath("/holdings");
    revalidatePath("/targets");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível atualizar o ativo." };
  }
}

export async function removeAssetAction(id: string): Promise<ActionResult> {
  try {
    await removeAsset(id);
    revalidatePath("/assets");
    revalidatePath("/holdings");
    revalidatePath("/targets");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível remover o ativo." };
  }
}

export async function seedExamplePortfolioAction(): Promise<ActionResult> {
  try {
    const assets = await listAssets();
    const assetByTicker = new Map(
      assets.map((asset) => [asset.ticker.toUpperCase(), asset])
    );

    for (const asset of exampleAssets) {
      const ticker = asset.ticker.toUpperCase();
      if (!assetByTicker.has(ticker)) {
        const created = await createAsset({ ticker, name: asset.name });
        assetByTicker.set(ticker, created);
      }
    }

    const holdings = [
      { ticker: "PETR4", qty: 120 },
      { ticker: "VALE3", qty: 40 },
      { ticker: "IVVB11", qty: 20 }
    ];

    const targets = [
      { ticker: "PETR4", target_percent: 35 },
      { ticker: "VALE3", target_percent: 25 },
      { ticker: "IVVB11", target_percent: 40 }
    ];

    for (const holding of holdings) {
      const asset = assetByTicker.get(holding.ticker);
      if (asset) {
        await createHolding({ asset_id: asset.id, qty: holding.qty });
      }
    }

    for (const target of targets) {
      const asset = assetByTicker.get(target.ticker);
      if (asset) {
        await createTarget({ asset_id: asset.id, target_percent: target.target_percent });
      }
    }

    revalidatePath("/assets");
    revalidatePath("/holdings");
    revalidatePath("/targets");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível criar os exemplos." };
  }
}
