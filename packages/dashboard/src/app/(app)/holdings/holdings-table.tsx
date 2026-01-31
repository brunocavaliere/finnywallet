"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { HoldingWithPrice } from "@/domains/portfolio/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

import { removeHoldingAction, upsertHoldingAction } from "./actions";

interface HoldingsTableProps {
  holdings: HoldingWithPrice[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  type AssetOption = {
    ticker: string;
    name: string | null;
    category: string | null;
    custom?: boolean;
  };
  const [comboOpen, setComboOpen] = useState(false);
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const comboRef = useRef<HTMLDivElement | null>(null);
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [editingHolding, setEditingHolding] = useState<HoldingWithPrice | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<HoldingWithPrice | null>(
    null
  );
  const [pending, startTransition] = useTransition();
  const [refreshPending, startRefreshTransition] = useTransition();

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
          items: { ticker: string; name: string | null; category: string | null }[];
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

  const displayedOptions = useMemo(() => {
    if (!ticker.trim()) {
      return assetOptions;
    }
    return assetOptions;
  }, [assetOptions, ticker]);

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
        qty: Number(qty)
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(editingHolding ? "Posição atualizada." : "Posição criada.");
      setOpen(false);
    });
  };

  const handleDelete = (holding: HoldingWithPrice) => {
    setDeleteTarget(holding);
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    startTransition(async () => {
      const result = await removeHoldingAction(deleteTarget.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Posição removida.");
      setDeleteTarget(null);
    });
  };

  const latestUpdatedAt = useMemo(() => {
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
  }, [holdings]);

  const hasMissingQuotes = holdings.some((holding) => !holding.price);

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(date);

  const handleRefreshQuotes = () => {
    setError(null);
    startRefreshTransition(async () => {
      try {
        const response = await fetch("/api/quotes/refresh", {
          method: "POST"
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
            `Preços atualizados${payload.updated ? ` (${payload.updated})` : ""}.`
          );
        }
        router.refresh();
      } catch {
        setError("Não foi possível atualizar os preços agora.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Posições</CardTitle>
            <CardDescription>
              Acompanhe a quantidade atual de cada posição.
            </CardDescription>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {hasMissingQuotes ? (
          <p className="text-sm text-muted-foreground">
            Alguns ativos ainda não têm preço. Clique em “Atualizar preços” para
            calcular o valor atualizado.
          </p>
        ) : null}
        {holdings.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            <p>Sua carteira ainda está vazia.</p>
            <Button type="button" onClick={() => openForm()} disabled={pending}>
              Adicionar primeira posição
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-border/40 bg-background/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((holding) => (
                  <TableRow key={holding.id}>
                    <TableCell>
                      <div className="font-medium">{holding.asset.ticker}</div>
                      {holding.asset.name ? (
                        <div className="text-xs text-muted-foreground">
                          {holding.asset.name}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{holding.qty}</TableCell>
                    <TableCell>
                    {holding.price ? (
                      formatBRL(Number(holding.price.price))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {holding.price ? (
                      formatBRL(
                        Number(holding.qty) * Number(holding.price.price)
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => openForm(holding)}
                          disabled={pending}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(holding)}
                          disabled={pending}
                        >
                          Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {editingHolding ? "Editar posição" : "Adicionar posição"}
            </SheetTitle>
            <SheetDescription>
              Informe o ticker, o nome (se quiser) e a quantidade atual.
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
                    ) : displayedOptions.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum ativo encontrado.
                      </div>
                    ) : (
                      displayedOptions.map((asset) => (
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

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(value) => {
        if (!value) {
          setDeleteTarget(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover posição</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Tem certeza que deseja remover ${deleteTarget.asset.ticker}?`
                : "Tem certeza que deseja remover esta posição?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Cancelar
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDelete}
                disabled={pending}
              >
                Remover
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
