"use client";

import { useState, useTransition } from "react";

import type { Asset, HoldingWithAsset } from "@/domains/portfolio/types";
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
import { Select, SelectItem } from "@/components/ui/select";

import { removeHoldingAction, upsertHoldingAction } from "./actions";

interface HoldingsTableProps {
  holdings: HoldingWithAsset[];
  assets: Asset[];
}

export function HoldingsTable({ holdings, assets }: HoldingsTableProps) {
  const [open, setOpen] = useState(false);
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [qty, setQty] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openForm = (holding?: HoldingWithAsset) => {
    if (holding) {
      setAssetId(holding.asset_id);
      setQty(String(holding.qty));
    } else {
      setAssetId(assets[0]?.id ?? "");
      setQty("0");
    }
    setError(null);
    setOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!assetId) {
      setError("Selecione um ativo.");
      return;
    }

    startTransition(async () => {
      const result = await upsertHoldingAction({
        asset_id: assetId,
        qty: Number(qty)
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(false);
    });
  };

  const handleDelete = (holding: HoldingWithAsset) => {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Posições</CardTitle>
            <CardDescription>
              Registre a quantidade atual de cada ativo.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => openForm()}
            disabled={pending || assets.length === 0}
          >
            Adicionar/Atualizar posição
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead className="w-32 text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  Nenhuma posição cadastrada ainda.
                </TableCell>
              </TableRow>
            ) : (
              holdings.map((holding) => (
                <TableRow key={holding.id}>
                  <TableCell className="font-medium">
                    {holding.asset.ticker}
                  </TableCell>
                  <TableCell>{holding.qty}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar/Atualizar posição</DialogTitle>
            <DialogDescription>
              Selecione o ativo e informe a quantidade atual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="asset">
                Ativo
              </label>
              <Select
                id="asset"
                value={assetId}
                onValueChange={setAssetId}
                disabled={assets.length === 0}
              >
                {assets.length === 0 ? (
                  <SelectItem value="">Cadastre um ativo primeiro</SelectItem>
                ) : (
                  assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.ticker}
                    </SelectItem>
                  ))
                )}
              </Select>
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
