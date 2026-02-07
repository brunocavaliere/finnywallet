"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

import { saveTargetsAction } from "./actions";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_ORDER,
  type AssetClass
} from "../rebalance/utils";

interface TargetsTableProps {
  targets: TargetWithAsset[];
  assets: Asset[];
}

type TargetValues = Record<string, string>;

export function TargetsTable({ targets, assets }: TargetsTableProps) {
  const groupedAssets = useMemo(() => {
    const sections = new Map<AssetClass, Asset[]>();
    ASSET_CLASS_ORDER.forEach((key) => sections.set(key, []));

    assets.forEach((asset) => {
      const klass = (asset.asset_class as AssetClass | null) ?? "acoes";
      const list = sections.get(klass) ?? [];
      list.push(asset);
      sections.set(klass, list);
    });

    return ASSET_CLASS_ORDER.map((klass) => ({
      key: klass,
      label: ASSET_CLASS_LABELS[klass],
      assets: sections.get(klass) ?? []
    })).filter((section) => section.assets.length > 0);
  }, [assets]);
  const [values, setValues] = useState<TargetValues>(() => {
    const initial: TargetValues = {};
    assets.forEach((asset) => {
      const existing = targets.find((target) => target.asset_id === asset.id);
      initial[asset.id] = existing
        ? Number(existing.target_percent).toFixed(2)
        : "0";
    });
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = useMemo(() => {
    return assets.reduce((sum, asset) => {
      const value = Number(values[asset.id] ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [assets, values]);

  const isTotalComplete = Math.abs(total - 100) < 0.01;
  const status = useMemo(() => {
    if (isTotalComplete) {
      return { label: "OK", variant: "secondary" as const };
    }
    return { label: "Ajustar", variant: "destructive" as const };
  }, [isTotalComplete]);

  const handleValueChange = (assetId: string, nextValue: string) => {
    if (nextValue === "") {
      setValues((current) => ({ ...current, [assetId]: "" }));
      return;
    }

    if (!/^\d{0,3}(\.\d{0,2})?$/.test(nextValue)) {
      return;
    }

    const numeric = Number(nextValue);
    if (!Number.isNaN(numeric) && numeric > 100) {
      return;
    }

    setValues((current) => ({ ...current, [assetId]: nextValue }));
  };

  const handleValueBlur = (assetId: string) => {
    const rawValue = values[assetId];
    if (rawValue === "") {
      setValues((current) => ({ ...current, [assetId]: "0" }));
      return;
    }
    const numeric = Number(rawValue);
    if (!Number.isNaN(numeric)) {
      setValues((current) => ({
        ...current,
        [assetId]: numeric.toFixed(2)
      }));
    }
  };

  const handleEqualDistribution = () => {
    if (assets.length === 0) {
      return;
    }

    const totalPoints = 10000;
    const base = Math.floor(totalPoints / assets.length);
    const remainder = totalPoints % assets.length;

    const updated: TargetValues = {};
    assets.forEach((asset, index) => {
      const points = base + (index < remainder ? 1 : 0);
      updated[asset.id] = (points / 100).toFixed(2);
    });

    setValues(updated);
  };

  const handleZero = () => {
    const updated: TargetValues = {};
    assets.forEach((asset) => {
      updated[asset.id] = "0";
    });
    setValues(updated);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const payload = assets.map((asset) => ({
        asset_id: asset.id,
        target_percent: Number(values[asset.id] ?? 0)
      }));

      const result = await saveTargetsAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Metas atualizadas.");
    });
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Distribuição por ativo</CardTitle>
        <CardDescription>
          Ajuste os percentuais para cada posição da sua carteira.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{total.toFixed(2)}%</span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        {!isTotalComplete ? (
          <p className="text-sm text-muted-foreground">
            As metas precisam somar 100% para um rebalanceamento ideal.
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {assets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              Adicione posições na carteira para definir metas.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/40 bg-background/40">
              <Accordion
                type="multiple"
                defaultValue={groupedAssets.map((section) => section.key)}
              >
                {groupedAssets.map((section) => (
                  <AccordionItem key={section.key} value={section.key}>
                    <AccordionTrigger className="px-4">
                      <div className="flex w-full items-center justify-between text-sm">
                        <span className="font-medium">{section.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {section.assets.length} ativo(s)
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ativo</TableHead>
                            <TableHead className="w-40">% alvo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {section.assets.map((asset) => (
                            <TableRow key={asset.id}>
                              <TableCell>
                                <div className="font-medium">{asset.ticker}</div>
                                {asset.name ? (
                                  <div className="text-xs text-muted-foreground">
                                    {asset.name}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={values[asset.id] ?? "0"}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  onChange={(event) =>
                                    handleValueChange(asset.id, event.target.value)
                                  }
                                  onBlur={() => handleValueBlur(asset.id)}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleEqualDistribution}
            disabled={assets.length === 0 || pending}
          >
            Distribuir igualmente
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleZero}
            disabled={assets.length === 0 || pending}
          >
            Zerar tudo
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={assets.length === 0 || pending}
          >
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
