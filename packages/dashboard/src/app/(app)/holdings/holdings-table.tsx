"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { HoldingWithQuote } from "@/domains/portfolio/types";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { removeHoldingAction, upsertHoldingAction } from "./actions";

interface HoldingsTableProps {
  holdings: HoldingWithQuote[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [editingHolding, setEditingHolding] = useState<HoldingWithQuote | null>(
    null
  );
  const [pending, startTransition] = useTransition();
  const [refreshPending, startRefreshTransition] = useTransition();

  const openForm = (holding?: HoldingWithQuote) => {
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

      setOpen(false);
    });
  };

  const handleDelete = (holding: HoldingWithQuote) => {
    if (!confirm(`Remover posição de ${holding.asset.ticker}?`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeHoldingAction(holding.id);
      if (!result.ok) {
        setError(result.error);
      }
    });
  };

  const latestUpdatedAt = useMemo(() => {
    const timestamps = holdings
      .map((holding) => holding.quote?.updated_at)
      .filter(Boolean) as string[];
    if (timestamps.length === 0) {
      return null;
    }
    const maxTimestamp = timestamps.reduce((latest, current) =>
      latest > current ? latest : current
    );
    return new Date(maxTimestamp);
  }, [holdings]);

  const hasMissingQuotes = holdings.some((holding) => !holding.quote);

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
              Atualizar preços
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
      <CardContent>
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
                    {holding.quote ? (
                      formatBRL(Number(holding.quote.price))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {holding.quote ? (
                      formatBRL(
                        Number(holding.qty) * Number(holding.quote.price)
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
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHolding ? "Editar posição" : "Adicionar posição"}
            </DialogTitle>
            <DialogDescription>
              Informe o ticker, o nome (se quiser) e a quantidade atual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ticker">
                Ticker
              </label>
              <Input
                id="ticker"
                placeholder="Ex: PETR4"
                value={ticker}
                onChange={(event) => setTicker(event.target.value)}
                required
                disabled={Boolean(editingHolding)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Nome (opcional)
              </label>
              <Input
                id="name"
                placeholder="Ex: Petrobras"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
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
            <DialogFooter>
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
