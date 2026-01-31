"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  HoldingWithPrice,
  TargetWithAsset,
} from "@/domains/portfolio/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { removeHoldingAction, upsertHoldingAction } from "../holdings/actions";

interface RebalanceClientProps {
  holdings: HoldingWithPrice[];
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
    currency: "BRL",
  }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

type RebalanceMode = "deposit" | "full";

export function RebalanceClient({ holdings, targets }: RebalanceClientProps) {
  const router = useRouter();
  const [deposit, setDeposit] = useState("0");
  const [mode, setMode] = useState<RebalanceMode>("deposit");
  const [open, setOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<HoldingWithPrice | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<HoldingWithPrice | null>(
    null
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [refreshPending, startRefreshTransition] = useTransition();
  const [comboOpen, setComboOpen] = useState(false);
  const [assetOptions, setAssetOptions] = useState<
    { ticker: string; name: string | null; category: string | null }[]
  >([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const comboRef = useRef<HTMLDivElement | null>(null);
  const deletingRef = useRef(false);

  const { hasAllQuotes, latestUpdatedAt, totalTargets } = useMemo(() => {
    const quotes = holdings
      .map((holding) => holding.price)
      .filter(Boolean)
      .map((quote) => quote!);

    const hasAllQuotesValue =
      holdings.length > 0 &&
      holdings.every((holding) =>
        holding.price ? toNumber(holding.price.price) > 0 : false
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
      totalTargets: totalTargetsValue,
    };
  }, [holdings, targets]);

  const depositValue = toNumber(deposit);
  const canCalculate =
    holdings.length > 0 && hasAllQuotes && Math.abs(totalTargets - 100) < 0.01;

  const isFullRebalance = mode === "full";

  const rows: RebalanceRow[] = useMemo(() => {
    if (!canCalculate) {
      return [];
    }

    const targetsByAsset = new Map(
      targets.map((target) => [
        target.asset_id,
        toNumber(target.target_percent),
      ])
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
  }, [canCalculate, depositValue, holdings, mode, targets]);

  const rowsByAssetId = useMemo(() => {
    return new Map(rows.map((row) => [row.assetId, row]));
  }, [rows]);

  const hasMissingQuotes = holdings.some((holding) => !holding.price);

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);

  const openForm = (holding?: HoldingWithPrice) => {
    if (holding) {
      setTicker(holding.asset.ticker);
      setName(holding.asset.name ?? "");
      setQty(String(holding.qty));
      setEditingHolding(holding);
    } else {
      setTicker("");
      setName("");
      setQty("0");
      setEditingHolding(null);
    }
    setError(null);
    setOpen(true);
  };

  useEffect(() => {
    if (!comboOpen) {
      return;
    }
    if (!ticker.trim()) {
      setAssetOptions([]);
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setAssetLoading(true);
      try {
        const response = await fetch(
          `/api/b3-assets?query=${encodeURIComponent(ticker)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          setAssetOptions([]);
          return;
        }
        const payload = (await response.json()) as {
          items: {
            ticker: string;
            name: string | null;
            category: string | null;
          }[];
        };
        setAssetOptions(payload.items ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setAssetOptions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setAssetLoading(false);
        }
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [comboOpen, ticker]);

  useEffect(() => {
    if (!comboOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!comboRef.current) return;
      if (!comboRef.current.contains(event.target as Node)) {
        setComboOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [comboOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!ticker.trim()) {
      setError("Informe o ticker.");
      return;
    }

    startTransition(async () => {
      const result = await upsertHoldingAction({
        ticker,
        name,
        qty: Number(qty),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(editingHolding ? "Posição atualizada." : "Posição criada.");
      setOpen(false);
      setEditingHolding(null);
      router.refresh();
    });
  };

  const handleDelete = (holding: HoldingWithPrice) => {
    setDeleteTarget(holding);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    deletingRef.current = true;
    setDeleting(true);
    startTransition(async () => {
      const result = await removeHoldingAction(deleteTarget.id);
      if (!result.ok) {
        setError(result.error);
        deletingRef.current = false;
        setDeleting(false);
        return;
      }
      toast.success("Posição removida.");
      setDeleteOpen(false);
      setDeleteTarget(null);
      deletingRef.current = false;
      setDeleting(false);
      router.refresh();
    });
  };

  const handleRefreshQuotes = () => {
    setError(null);
    startRefreshTransition(async () => {
      try {
        const response = await fetch("/api/quotes/refresh", {
          method: "POST",
        });
        if (!response.ok) {
          throw new Error("Falha ao atualizar preços.");
        }
        const payload = (await response.json()) as {
          updated?: number;
          skipped?: boolean;
        };
        if (payload.skipped) {
          toast.success("Preços já estavam atualizados.");
        } else {
          toast.success(
            `Preços atualizados${
              payload.updated ? ` (${payload.updated})` : ""
            }.`
          );
        }
        router.refresh();
      } catch {
        setError("Não foi possível atualizar os preços agora.");
      }
    });
  };

  const formatSuggestion = (value: number) => {
    if (mode === "full") {
      if (value < 0) {
        return (
          <span className="text-rose-400">
            Vender {formatBRL(Math.abs(value))}
          </span>
        );
      }
      return (
        <span className="text-emerald-400">Comprar {formatBRL(value)}</span>
      );
    }

    return formatBRL(value);
  };

  return (
    <div className="flex h-full flex-col">
      <Card className="flex flex-1 flex-col">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>
                {mode === "full"
                  ? "Sugestão de rebalanceamento"
                  : "Sugestão de compra"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Acompanhe as posições e a recomendação de ajuste.
              </p>
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
                onClick={handleRefreshQuotes}
                disabled={refreshPending || holdings.length === 0}
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
              <Button
                type="button"
                onClick={() => openForm()}
                disabled={pending}
              >
                Adicionar posição
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-6 text-sm">
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="deposit">
                Valor do aporte
              </label>
              <div className="flex h-10 items-center rounded-md border border-border bg-background px-2 text-sm">
                <span className="text-muted-foreground">R$</span>
                <Input
                  id="deposit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deposit}
                  onChange={(event) => setDeposit(event.target.value)}
                  className="h-9 w-28 border-0 bg-transparent px-2 text-right focus-visible:ring-0"
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
                    setMode(checked ? "full" : "deposit")
                  }
                  onClick={() =>
                    setMode((prev) => (prev === "full" ? "deposit" : "full"))
                  }
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
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {holdings.length === 0 ? (
              <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                <p>Sua carteira ainda está vazia.</p>
                <Button
                  type="button"
                  onClick={() => openForm()}
                  disabled={pending}
                >
                  Adicionar primeira posição
                </Button>
              </div>
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
            {holdings.length > 0 ? (
              <div className="h-[calc(100vh-400px)] min-h-0 overflow-auto rounded-md border border-border/40 bg-background/40">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">% atual</TableHead>
                      <TableHead className="text-right">% alvo</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead className="text-right">
                        {mode === "full" ? "Sugestão" : "Sugestão"}
                      </TableHead>
                      <TableHead className="w-20 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.map((holding) => {
                      const row = rowsByAssetId.get(holding.asset_id);
                      const currentPercent =
                        canCalculate && row
                          ? formatPercent(row.currentPercent)
                          : "—";
                      const targetPercent =
                        canCalculate && row
                          ? formatPercent(row.targetPercent)
                          : "—";
                      const difference =
                        canCalculate && row
                          ? formatPercent(row.difference)
                          : "—";
                      const suggestion =
                        canCalculate && row
                          ? formatSuggestion(row.suggestedBuy)
                          : "—";
                      const price = holding.price
                        ? formatBRL(toNumber(holding.price.price))
                        : null;
                      const total = holding.price
                        ? formatBRL(
                            toNumber(holding.qty) *
                              toNumber(holding.price.price)
                          )
                        : null;

                      return (
                        <TableRow key={holding.id}>
                          <TableCell>
                            <div className="font-medium">
                              {holding.asset.ticker}
                            </div>
                            {holding.asset.name ? (
                              <div className="text-xs text-muted-foreground">
                                {holding.asset.name}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            {holding.qty}
                          </TableCell>
                          <TableCell className="text-right">
                            {price ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {total ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {currentPercent}
                          </TableCell>
                          <TableCell className="text-right">
                            {targetPercent}
                          </TableCell>
                          <TableCell className="text-right">
                            {difference}
                          </TableCell>
                          <TableCell className="text-right">
                            {suggestion}
                          </TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider delayDuration={150}>
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={() => openForm(holding)}
                                      disabled={pending}
                                      aria-label="Editar posição"
                                      size="sm"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={() => handleDelete(holding)}
                                      disabled={pending}
                                      aria-label="Remover posição"
                                      size="sm"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Remover</TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : null}
            {hasMissingQuotes ? (
              <p className="text-sm text-muted-foreground">
                Alguns ativos ainda não têm preço. Clique em “Atualizar preços”
                para calcular o valor atualizado.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {editingHolding ? "Editar posição" : "Adicionar posição"}
            </SheetTitle>
            <SheetDescription>
              Informe o ticker do ativo e a quantidade atual.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ticker">
                Ticker
              </label>
              <div ref={comboRef} className="relative">
                <Input
                  id="ticker"
                  placeholder="Buscar ativo"
                  value={ticker}
                  onFocus={() => setComboOpen(true)}
                  onChange={(event) =>
                    setTicker(event.target.value.toUpperCase())
                  }
                  required
                  disabled={Boolean(editingHolding)}
                />
                {comboOpen ? (
                  <div className="absolute z-[100] mt-2 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-background p-1 shadow-md">
                    {assetLoading ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Carregando...
                      </div>
                    ) : assetOptions.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum ativo encontrado.
                      </div>
                    ) : (
                      assetOptions.map((asset) => (
                        <button
                          key={asset.ticker}
                          type="button"
                          className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition hover:bg-muted/60"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setTicker(asset.ticker);
                            setName(asset.name ?? "");
                            setComboOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{asset.ticker}</span>
                            {asset.name ? (
                              <span className="text-xs text-muted-foreground">
                                {asset.name}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="qty">
                Quantidade
              </label>
              <Input
                id="qty"
                type="number"
                min="0"
                step="0.0001"
                value={qty}
                onChange={(event) => setQty(event.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <SheetFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                Salvar
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={() => {}}>
        <AlertDialogContent
          onEscapeKeyDown={(event) => {
            if (deletingRef.current) {
              event.preventDefault();
            }
          }}
          onPointerDownOutside={(event) => {
            if (deletingRef.current) {
              event.preventDefault();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Remover posição</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Tem certeza que deseja remover ${deleteTarget.asset.ticker}?`
                : "Tem certeza que deseja remover esta posição?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || deleting}
              onClick={() => {
                if (deletingRef.current) {
                  return;
                }
                setDeleteOpen(false);
                setDeleteTarget(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmDelete} disabled={pending || deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
