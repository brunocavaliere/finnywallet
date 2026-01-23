"use client";

import { useMemo, useState, useTransition } from "react";

import type { Asset, TargetWithAsset } from "@/domains/portfolio/types";
import { Badge } from "@/components/ui/badge";
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

import { removeTargetAction, upsertTargetAction } from "./actions";

interface TargetsTableProps {
  targets: TargetWithAsset[];
  assets: Asset[];
}

export function TargetsTable({ targets, assets }: TargetsTableProps) {
  const [open, setOpen] = useState(false);
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [percent, setPercent] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = useMemo(() => {
    return targets.reduce((sum, target) => sum + Number(target.target_percent), 0);
  }, [targets]);

  const openForm = (target?: TargetWithAsset) => {
    if (target) {
      setAssetId(target.asset_id);
      setPercent(String(target.target_percent));
    } else {
      setAssetId(assets[0]?.id ?? "");
      setPercent("0");
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
      const result = await upsertTargetAction({
        asset_id: assetId,
        target_percent: Number(percent)
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(false);
    });
  };

  const handleDelete = (target: TargetWithAsset) => {
    if (!confirm(`Remover meta de ${target.asset.ticker}?`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeTargetAction(target.id);
      if (!result.ok) {
        setError(result.error);
      }
    });
  };

  const isTotalComplete = Math.abs(total - 100) < 0.01;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Targets</CardTitle>
            <CardDescription>
              Defina a alocação desejada por ativo.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => openForm()}
            disabled={pending || assets.length === 0}
          >
            Adicionar/Atualizar meta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{total.toFixed(2)}%</span>
          <Badge variant={isTotalComplete ? "secondary" : "destructive"}>
            {isTotalComplete ? "100%" : "Ajustar"}
          </Badge>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Percentual</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  Nenhuma meta cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              targets.map((target) => (
                <TableRow key={target.id}>
                  <TableCell className="font-medium">
                    {target.asset.ticker}
                  </TableCell>
                  <TableCell>{target.target_percent}%</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openForm(target)}
                        disabled={pending}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(target)}
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
            <DialogTitle>Adicionar/Atualizar meta</DialogTitle>
            <DialogDescription>
              Escolha um ativo e informe o percentual desejado.
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
              <label className="text-sm font-medium" htmlFor="percent">
                Percentual (%)
              </label>
              <Input
                id="percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
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
