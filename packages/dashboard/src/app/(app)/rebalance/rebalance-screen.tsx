"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { HoldingWithPrice, TargetWithAsset } from "@/domains/portfolio/types";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import { removeHoldingAction, upsertHoldingAction } from "../holdings/actions";
import { RebalanceDeleteDialog } from "./components/rebalance-delete-dialog";
import { RebalanceHeader } from "./components/rebalance-header";
import { RebalanceHoldingSheet } from "./components/rebalance-holding-sheet";
import { RebalanceTable } from "./components/rebalance-table";
import { useB3AssetOptions } from "./hooks/use-b3-asset-options";
import { useTreasuryOptions } from "./hooks/use-treasury-options";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_ORDER,
  buildRebalanceRows,
  formatBRL,
  formatTreasuryLabel,
  getLatestUpdatedAt,
  toNumber,
  type AssetClass,
  type RebalanceMode,
} from "./utils";

interface RebalanceScreenProps {
  holdings: HoldingWithPrice[];
  targets: TargetWithAsset[];
}

export function RebalanceScreen({ holdings, targets }: RebalanceScreenProps) {
  const router = useRouter();
  const [deposit, setDeposit] = useState("0");
  const [mode, setMode] = useState<RebalanceMode>("deposit");
  const [open, setOpen] = useState(false);
  const [assetClass, setAssetClass] = useState<AssetClass>("acoes");
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
  const [treasuryOpen, setTreasuryOpen] = useState(false);
  const [treasuryQuery, setTreasuryQuery] = useState("");
  const [treasurySelection, setTreasurySelection] = useState<{
    title_type: string;
    maturity_date: string;
  } | null>(null);
  const [sort, setSort] = useState<{
    key: "value" | "suggestion";
    direction: "asc" | "desc";
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const comboRef = useRef<HTMLDivElement | null>(null);
  const treasuryRef = useRef<HTMLDivElement | null>(null);
  const deletingRef = useRef(false);

  const { options: assetOptions, loading: assetLoading } = useB3AssetOptions(
    comboOpen,
    ticker
  );
  const { options: treasuryOptions, loading: treasuryLoading } =
    useTreasuryOptions(treasuryOpen, treasuryQuery);

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

  const rows = useMemo(
    () =>
      buildRebalanceRows({
        holdings,
        targets,
        depositValue,
        mode,
        canCalculate,
      }),
    [holdings, targets, depositValue, mode, canCalculate]
  );

  const rowsByAssetId = useMemo(
    () => new Map(rows.map((row) => [row.assetId, row])),
    [rows]
  );

  const hasMissingQuotes = holdings.some((holding) => !holding.price);

  const filteredAssetOptions = useMemo(() => {
    if (assetClass === "tesouro" || assetClass === "renda_fixa") {
      return [];
    }
    return assetOptions.filter((option) => {
      const category = option.category?.toUpperCase() ?? "";
      if (assetClass === "fiis") {
        return category.includes("FII") || category.includes("FUND");
      }
      if (assetClass === "etfs") {
        return category.startsWith("ETF");
      }
      return (
        category === "SHARES" ||
        category === "BDR" ||
        category === "UNIT" ||
        category.includes("SHARE")
      );
    });
  }, [assetOptions, assetClass]);

  const sortedHoldings = useMemo(() => {
    if (!sort) {
      return holdings;
    }

    const items = [...holdings];

    const getValue = (holding: HoldingWithPrice) => {
      if (!holding.price) return null;
      return toNumber(holding.qty) * toNumber(holding.price.price);
    };

    const getSuggestion = (holding: HoldingWithPrice) => {
      if (!canCalculate) return null;
      const row = rowsByAssetId.get(holding.asset_id);
      return row ? row.suggestedBuy : null;
    };

    const direction = sort.direction === "asc" ? 1 : -1;

    items.sort((a, b) => {
      const aValue = sort.key === "value" ? getValue(a) : getSuggestion(a);
      const bValue = sort.key === "value" ? getValue(b) : getSuggestion(b);

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      if (aValue === bValue) return 0;
      return aValue > bValue ? direction : -direction;
    });

    return items;
  }, [holdings, rowsByAssetId, sort, canCalculate]);

  const groupedHoldings = useMemo(() => {
    const sections = new Map<AssetClass, HoldingWithPrice[]>();
    ASSET_CLASS_ORDER.forEach((key) => sections.set(key, []));

    sortedHoldings.forEach((holding) => {
      let klass = holding.asset.asset_class as AssetClass | null;
      if (!klass) {
        if (holding.asset.ticker.startsWith("TD:")) {
          klass = "tesouro";
        } else {
          klass = "acoes";
        }
      }
      const list = sections.get(klass) ?? [];
      list.push(holding);
      sections.set(klass, list);
    });

    return ASSET_CLASS_ORDER.map((klass) => ({
      key: klass,
      label: ASSET_CLASS_LABELS[klass],
      holdings: sections.get(klass) ?? []
    })).filter((section) => section.holdings.length > 0);
  }, [sortedHoldings]);


  const openForm = (holding?: HoldingWithPrice) => {
    if (holding) {
      setTicker(holding.asset.ticker);
      setName(holding.asset.name ?? "");
      setQty(String(holding.qty));
      setEditingHolding(holding);
      if (holding.asset.ticker.startsWith("TD:")) {
        setAssetClass("tesouro");
        const [, titleType, maturityDate] = holding.asset.ticker.split(":");
        if (titleType && maturityDate) {
          setTreasurySelection({
            title_type: titleType,
            maturity_date: maturityDate,
          });
          setTreasuryQuery(formatTreasuryLabel(titleType, maturityDate));
        }
      } else {
        setAssetClass(
          (holding.asset.asset_class as AssetClass | null) ?? "acoes"
        );
      }
    } else {
      setTicker("");
      setName("");
      setQty("0");
      setEditingHolding(null);
      setAssetClass("acoes");
      setTreasurySelection(null);
      setTreasuryQuery("");
    }
    setError(null);
    setOpen(true);
  };

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

  useEffect(() => {
    if (!treasuryOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!treasuryRef.current) return;
      if (!treasuryRef.current.contains(event.target as Node)) {
        setTreasuryOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [treasuryOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!ticker.trim()) {
      setError("Informe o ticker.");
      return;
    }

    const resolvedName =
      name ||
      filteredAssetOptions.find((option) => option.ticker === ticker)?.name ||
      null;

    startTransition(async () => {
      const result = await upsertHoldingAction({
        ticker,
        name: resolvedName,
        asset_class: assetClass,
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
        const [b3Response, treasuryResponse] = await Promise.all([
          fetch("/api/quotes/refresh", { method: "POST" }),
          fetch("/api/treasury/refresh", { method: "POST" })
        ]);

        if (!b3Response.ok) {
          throw new Error("Falha ao atualizar preços da B3.");
        }
        if (!treasuryResponse.ok) {
          throw new Error("Falha ao atualizar preços do Tesouro.");
        }

        const b3Payload = (await b3Response.json()) as {
          updated?: number;
          skipped?: boolean;
        };
        const treasuryPayload = (await treasuryResponse.json()) as {
          inserted?: number;
          skipped?: number;
        };

        const b3Message = b3Payload.skipped
          ? "B3 já estava atualizada."
          : `B3 atualizada${b3Payload.updated ? ` (${b3Payload.updated})` : ""}.`;

        const treasuryMessage =
          treasuryPayload.inserted && treasuryPayload.inserted > 0
            ? `Tesouro atualizado (${treasuryPayload.inserted}).`
            : "Tesouro já estava atualizado.";

        toast.success(`${b3Message} ${treasuryMessage}`);
        router.refresh();
      } catch {
        setError("Não foi possível atualizar os preços agora.");
      }
    });
  };

  const handleSort = (key: "value" | "suggestion") => {
    setSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  };

  const formatSuggestion = (value: number) => {
    if (mode === "full") {
      if (value < 0) {
        return (
          <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-1 text-sm font-semibold text-rose-400">
            Vender {formatBRL(Math.abs(value))}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-sm font-semibold text-emerald-400">
          Comprar {formatBRL(value)}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-sm font-semibold text-emerald-400">
        {formatBRL(value)}
      </span>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <Card className="flex flex-1 flex-col">
        <RebalanceHeader
          mode={mode}
          deposit={deposit}
          latestUpdatedAt={latestUpdatedAt ?? getLatestUpdatedAt(holdings)}
          refreshPending={refreshPending}
          pending={pending}
          holdingsCount={holdings.length}
          onDepositChange={setDeposit}
          onModeChange={setMode}
          onRefresh={handleRefreshQuotes}
          onAddHolding={() => openForm()}
        />
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {holdings.length === 0 ? (
              <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                <p>Sua carteira ainda está vazia.</p>
                <button
                  type="button"
                  className="text-sm font-medium text-primary"
                  onClick={() => openForm()}
                  disabled={pending}
                >
                  Adicionar primeira posição
                </button>
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
              <RebalanceTable
                sections={groupedHoldings}
                rowsByAssetId={rowsByAssetId}
                canCalculate={canCalculate}
                mode={mode}
                pending={pending}
                sortKey={sort?.key ?? null}
                sortDirection={sort?.direction ?? null}
                onSort={handleSort}
                onEdit={openForm}
                onDelete={handleDelete}
                formatSuggestion={formatSuggestion}
              />
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

      <RebalanceHoldingSheet
        open={open}
        onOpenChange={setOpen}
        editing={Boolean(editingHolding)}
        assetClass={assetClass}
        onAssetClassChange={(value) => {
          setAssetClass(value);
          setTicker("");
          setName("");
          setTreasurySelection(null);
          setTreasuryQuery("");
          setComboOpen(false);
          setTreasuryOpen(false);
        }}
        ticker={ticker}
        name={name}
        qty={qty}
        onTickerChange={setTicker}
        onNameChange={setName}
        onQtyChange={setQty}
        onSubmit={handleSubmit}
        pending={pending}
        error={error}
        comboOpen={comboOpen}
        setComboOpen={setComboOpen}
        assetOptions={filteredAssetOptions}
        assetLoading={assetLoading}
        comboRef={comboRef}
        treasuryOpen={treasuryOpen}
        setTreasuryOpen={setTreasuryOpen}
        treasuryQuery={treasuryQuery}
        setTreasuryQuery={setTreasuryQuery}
        treasuryOptions={treasuryOptions}
        treasuryLoading={treasuryLoading}
        setTreasurySelection={setTreasurySelection}
        treasuryRef={treasuryRef}
      />

      <RebalanceDeleteDialog
        open={deleteOpen}
        holding={deleteTarget}
        deleting={deleting}
        pending={pending}
        onCancel={() => {
          if (deletingRef.current) {
            return;
          }
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
