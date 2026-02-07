"use client";

import type { HoldingWithPrice, TargetWithAsset } from "@/domains/portfolio/types";

export type RebalanceMode = "deposit" | "full";
export type AssetClass = "acoes" | "fiis" | "etfs" | "tesouro" | "renda_fixa";

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  acoes: "Ações",
  fiis: "FIIs",
  etfs: "ETFs",
  tesouro: "Tesouro",
  renda_fixa: "Renda fixa",
};

export const ASSET_CLASS_ORDER: AssetClass[] = [
  "acoes",
  "fiis",
  "etfs",
  "tesouro",
  "renda_fixa",
];

export type RebalanceRow = {
  assetId: string;
  ticker: string;
  name: string | null;
  currentPercent: number;
  targetPercent: number;
  difference: number;
  suggestedBuy: number;
};

export const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export const formatPercent = (value: number) => `${value.toFixed(2)}%`;

export const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);

export const formatTreasuryLabel = (titleType: string, maturityDate: string) => {
  const [year, month, day] = maturityDate.split("-");
  const formatted =
    day && month && year ? `${day}/${month}/${year}` : maturityDate;
  return `${titleType} ${formatted}`.trim();
};

export function getLatestUpdatedAt(holdings: HoldingWithPrice[]) {
  const timestamps = holdings
    .map((holding) => holding.price?.updated_at)
    .filter(Boolean) as string[];
  if (timestamps.length === 0) {
    return null;
  }
  const maxTimestamp = timestamps.reduce((latest, current) =>
    latest > current ? latest : current
  );
  return new Date(maxTimestamp);
}

export function buildRebalanceRows(params: {
  holdings: HoldingWithPrice[];
  targets: TargetWithAsset[];
  depositValue: number;
  mode: RebalanceMode;
  canCalculate: boolean;
}): RebalanceRow[] {
  const { holdings, targets, depositValue, mode, canCalculate } = params;

  if (!canCalculate) {
    return [];
  }

  const targetsByAsset = new Map(
    targets.map((target) => [target.asset_id, toNumber(target.target_percent)])
  );

  const currentValues = holdings.map((holding) => {
    const qty = toNumber(holding.qty);
    const price = holding.price ? toNumber(holding.price.price) : 0;
    return qty * price;
  });

  const totalCurrent = currentValues.reduce((sum, value) => sum + value, 0);
  const totalWithDeposit = totalCurrent + depositValue;

  const targetValues = holdings.map((holding) => {
    const targetPercent = targetsByAsset.get(holding.asset_id) ?? 0;
    return (targetPercent / 100) * totalWithDeposit;
  });

  let allocations: number[] = [];
  let desiredTotal = 0;

  if (mode === "full") {
    allocations = targetValues.map(
      (targetValue, index) => targetValue - currentValues[index]
    );
    desiredTotal = allocations.reduce((sum, value) => sum + value, 0);
  } else {
    const desiredBuys = targetValues.map((targetValue, index) =>
      Math.max(0, targetValue - currentValues[index])
    );
    desiredTotal = desiredBuys.reduce((sum, value) => sum + value, 0);
    allocations = desiredBuys.slice();

    if (desiredTotal > 0) {
      if (desiredTotal > depositValue) {
        const ratio = depositValue / desiredTotal;
        allocations = desiredBuys.map((value) => value * ratio);
      } else if (desiredTotal < depositValue) {
        const remainder = depositValue - desiredTotal;
        allocations = desiredBuys.map(
          (value) => value + (value / desiredTotal) * remainder
        );
      }
    }
  }

  const roundedCents = allocations.map((value) => Math.round(value * 100));
  const targetCents = Math.round(depositValue * 100);
  const totalCents = roundedCents.reduce((sum, value) => sum + value, 0);
  let diff = targetCents - totalCents;

  if (diff !== 0 && roundedCents.length > 0) {
    const order = allocations
      .map((value, index) => ({ index, weight: Math.abs(value) }))
      .sort((a, b) => b.weight - a.weight);
    let pointer = 0;
    while (diff !== 0 && order.length > 0) {
      const targetIndex = order[pointer % order.length].index;
      if (diff > 0) {
        roundedCents[targetIndex] += 1;
        diff -= 1;
      } else {
        roundedCents[targetIndex] -= 1;
        diff += 1;
      }
      pointer += 1;
    }
  }

  return holdings.map((holding, index) => {
    const targetPercent = targetsByAsset.get(holding.asset_id) ?? 0;
    const currentValue = currentValues[index];
    const totalValue = totalCurrent || 1;
    const currentPercent = (currentValue / totalValue) * 100;
    const difference = targetPercent - currentPercent;
    return {
      assetId: holding.asset_id,
      ticker: holding.asset.ticker,
      name: holding.asset.name,
      currentPercent,
      targetPercent,
      difference,
      suggestedBuy: roundedCents[index] / 100,
    };
  });
}
