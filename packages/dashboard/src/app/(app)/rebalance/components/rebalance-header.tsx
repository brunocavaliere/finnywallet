"use client";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

import type { RebalanceMode } from "../utils";
import { formatDateTime } from "../utils";

interface RebalanceHeaderProps {
  mode: RebalanceMode;
  deposit: string;
  latestUpdatedAt: Date | null;
  refreshPending: boolean;
  pending: boolean;
  holdingsCount: number;
  onDepositChange: (value: string) => void;
  onModeChange: (mode: RebalanceMode) => void;
  onRefresh: () => void;
  onAddHolding: () => void;
}

export function RebalanceHeader({
  mode,
  deposit,
  latestUpdatedAt,
  refreshPending,
  pending,
  holdingsCount,
  onDepositChange,
  onModeChange,
  onRefresh,
  onAddHolding,
}: RebalanceHeaderProps) {
  const isFullRebalance = mode === "full";

  return (
    <CardHeader className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>
            {mode === "full"
              ? "Sugestão de rebalanceamento"
              : "Sugestão de compra"}
          </CardTitle>
          {latestUpdatedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Atualizado em: {formatDateTime(latestUpdatedAt)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onRefresh}
            disabled={refreshPending || holdingsCount === 0}
          >
            {refreshPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              "Atualizar preços"
            )}
          </Button>
          <Button type="button" onClick={onAddHolding} disabled={pending}>
            Adicionar posição
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-6 text-sm">
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="deposit"
          >
            Valor do aporte
          </label>
          <div className="flex h-12 items-center rounded-md border border-primary/40 bg-primary/5 px-3 text-base shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">
              R$
            </span>
            <Input
              id="deposit"
              type="number"
              min="0"
              step="0.01"
              value={deposit}
              onChange={(event) => onDepositChange(event.target.value)}
              className="h-10 w-36 border-0 bg-transparent px-2 text-right text-base font-semibold focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-medium">Rebalanceamento</span>
          <div className="flex h-10 items-center gap-2">
            <Switch
              id="rebalance-mode"
              checked={isFullRebalance}
              onCheckedChange={(checked) =>
                onModeChange(checked ? "full" : "deposit")
              }
              onClick={() => onModeChange(isFullRebalance ? "deposit" : "full")}
            />
            <label
              htmlFor="rebalance-mode"
              className="w-28 text-sm text-muted-foreground"
            >
              {isFullRebalance ? "Com vendas" : "Somente aporte"}
            </label>
          </div>
        </div>
      </div>
    </CardHeader>
  );
}
