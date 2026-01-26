"use client";

import { useMemo, useState } from "react";

import type { HoldingWithQuote, TargetWithAsset } from "@/domains/portfolio/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface RebalanceClientProps {
  holdings: HoldingWithQuote[];
  targets: TargetWithAsset[];
}

type RebalanceRow = {
  assetId: string;
  ticker: string;
  name: string | null;
  currentPercent: number;
  targetPercent: number;
  difference: number;
  suggestedBuy: number;
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function RebalanceClient({ holdings, targets }: RebalanceClientProps) {
  const [deposit, setDeposit] = useState("0");

  const { hasAllQuotes, latestUpdatedAt, totalTargets } = useMemo(() => {
    const quotes = holdings
      .map((holding) => holding.quote)
      .filter(Boolean)
      .map((quote) => quote!);

    const hasAllQuotesValue =
      holdings.length > 0 &&
      holdings.every((holding) =>
        holding.quote ? toNumber(holding.quote.price) > 0 : false
      );

    const latest = quotes.reduce<string | null>((current, quote) => {
      if (!current) {
        return quote.updated_at;
      }
      return current > quote.updated_at ? current : quote.updated_at;
    }, null);

    const totalTargetsValue = targets.reduce(
      (sum, target) => sum + toNumber(target.target_percent),
      0
    );

    return {
      hasAllQuotes: hasAllQuotesValue,
      latestUpdatedAt: latest ? new Date(latest) : null,
      totalTargets: totalTargetsValue
    };
  }, [holdings, targets]);

  const targetStatus = useMemo(() => {
    if (Math.abs(totalTargets - 100) < 0.01) {
      return { label: "OK", variant: "secondary" as const };
    }
    return { label: "Ajustar", variant: "destructive" as const };
  }, [totalTargets]);

  const depositValue = toNumber(deposit);
  const canCalculate =
    holdings.length > 0 &&
    hasAllQuotes &&
    Math.abs(totalTargets - 100) < 0.01;

  const rows: RebalanceRow[] = useMemo(() => {
    if (!canCalculate) {
      return [];
    }

    const targetsByAsset = new Map(
      targets.map((target) => [target.asset_id, toNumber(target.target_percent)])
    );

    const currentValues = holdings.map((holding) => {
      const qty = toNumber(holding.qty);
      const price = holding.quote ? toNumber(holding.quote.price) : 0;
      return qty * price;
    });

    const totalCurrent = currentValues.reduce((sum, value) => sum + value, 0);
    const totalWithDeposit = totalCurrent + depositValue;

    const desiredBuys = holdings.map((holding, index) => {
      const targetPercent = targetsByAsset.get(holding.asset_id) ?? 0;
      const targetValue = (targetPercent / 100) * totalWithDeposit;
      const currentValue = currentValues[index];
      return Math.max(0, targetValue - currentValue);
    });

    const desiredTotal = desiredBuys.reduce((sum, value) => sum + value, 0);

    let allocations = desiredBuys.slice();
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

    const roundedCents = allocations.map((value) => Math.round(value * 100));
    if (desiredTotal > 0) {
      const targetCents = Math.round(depositValue * 100);
      const totalCents = roundedCents.reduce((sum, value) => sum + value, 0);
      let diff = targetCents - totalCents;

      if (diff !== 0) {
        const order = allocations
          .map((value, index) => ({ index, value }))
          .sort((a, b) => b.value - a.value);
        let pointer = 0;
        while (diff !== 0 && order.length > 0) {
          const targetIndex = order[pointer % order.length].index;
          if (diff > 0) {
            roundedCents[targetIndex] += 1;
            diff -= 1;
          } else if (roundedCents[targetIndex] > 0) {
            roundedCents[targetIndex] -= 1;
            diff += 1;
          } else {
            pointer += 1;
            continue;
          }
          pointer += 1;
        }
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
        suggestedBuy: roundedCents[index] / 100
      };
    });
  }, [canCalculate, depositValue, holdings, targets]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração do aporte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="deposit">
                Valor do aporte (R$)
              </label>
              <Input
                id="deposit"
                type="number"
                min="0"
                step="0.01"
                value={deposit}
                onChange={(event) => setDeposit(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Somente aporte</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked disabled />
                <span>Ativado nesta versão</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Sugestão de compra</CardTitle>
              {latestUpdatedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Atualizado em:{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short"
                  }).format(latestUpdatedAt)}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Total de metas:</span>
              <span className="font-medium">{totalTargets.toFixed(2)}%</span>
              <Badge variant={targetStatus.variant}>{targetStatus.label}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Adicione posições na carteira para gerar sugestões de compra.
            </p>
          ) : null}
          {holdings.length > 0 && !hasAllQuotes ? (
            <p className="text-sm text-muted-foreground">
              Atualize os preços para calcular o rebalanceamento.
            </p>
          ) : null}
          {holdings.length > 0 &&
          hasAllQuotes &&
          Math.abs(totalTargets - 100) >= 0.01 ? (
            <p className="text-sm text-muted-foreground">
              Ajuste as metas para totalizar 100% antes de calcular o aporte.
            </p>
          ) : null}
          {canCalculate ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead>% atual</TableHead>
                  <TableHead>% alvo</TableHead>
                  <TableHead>Diferença</TableHead>
                  <TableHead>Sugestão de compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.assetId}>
                    <TableCell>
                      <div className="font-medium">{row.ticker}</div>
                      {row.name ? (
                        <div className="text-xs text-muted-foreground">
                          {row.name}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{formatPercent(row.currentPercent)}</TableCell>
                    <TableCell>{formatPercent(row.targetPercent)}</TableCell>
                    <TableCell>{formatPercent(row.difference)}</TableCell>
                    <TableCell>{formatBRL(row.suggestedBuy)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
