"use client";

import { useState, useTransition } from "react";

import type { Asset } from "@/domains/portfolio/types";
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

import {
  createAssetAction,
  removeAssetAction,
  seedExamplePortfolioAction,
  updateAssetAction
} from "./actions";

interface AssetsTableProps {
  assets: Asset[];
  canSeed: boolean;
}

export function AssetsTable({ assets, canSeed }: AssetsTableProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const resetForm = () => {
    setEditing(null);
    setTicker("");
    setName("");
    setError(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setTicker(asset.ticker);
    setName(asset.name ?? "");
    setError(null);
    setOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedTicker = ticker.trim().toUpperCase();
    const normalizedName = name.trim();

    startTransition(async () => {
      const result = editing
        ? await updateAssetAction({
            id: editing.id,
            ticker: normalizedTicker,
            name: normalizedName.length ? normalizedName : null
          })
        : await createAssetAction({
            ticker: normalizedTicker,
            name: normalizedName.length ? normalizedName : null
          });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(false);
      resetForm();
    });
  };

  const handleDelete = (asset: Asset) => {
    if (!confirm(`Remover o ativo ${asset.ticker}?`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeAssetAction(asset.id);
      if (!result.ok) {
        setError(result.error);
      }
    });
  };

  const handleSeed = () => {
    startTransition(async () => {
      const result = await seedExamplePortfolioAction();
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
            <CardTitle>Ativos</CardTitle>
            <CardDescription>
              Cadastre os ativos que você acompanha.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSeed ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSeed}
                disabled={pending}
              >
                Criar exemplos
              </Button>
            ) : null}
            <Button type="button" onClick={openCreate} disabled={pending}>
              Adicionar ativo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-32 text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  Nenhum ativo cadastrado ainda.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.ticker}</TableCell>
                  <TableCell>{asset.name ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(asset)}
                        disabled={pending}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(asset)}
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
            <DialogTitle>
              {editing ? "Editar ativo" : "Adicionar ativo"}
            </DialogTitle>
            <DialogDescription>
              Informe o ticker e o nome opcional do ativo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ticker">
                Ticker
              </label>
              <Input
                id="ticker"
                value={ticker}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
                placeholder="Ex: PETR4"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Nome
              </label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Petrobras"
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
                {editing ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
