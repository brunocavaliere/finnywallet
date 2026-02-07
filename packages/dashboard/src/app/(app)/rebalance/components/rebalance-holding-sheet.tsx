"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type { B3AssetOption } from "../hooks/use-b3-asset-options";
import type { TreasuryOption } from "../hooks/use-treasury-options";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_ORDER,
  type AssetClass,
  formatTreasuryLabel
} from "../utils";

interface RebalanceHoldingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  assetClass: AssetClass;
  onAssetClassChange: (value: AssetClass) => void;
  ticker: string;
  name: string;
  qty: string;
  onTickerChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onQtyChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  error: string | null;
  comboOpen: boolean;
  setComboOpen: (open: boolean) => void;
  assetOptions: B3AssetOption[];
  assetLoading: boolean;
  comboRef: React.RefObject<HTMLDivElement>;
  treasuryOpen: boolean;
  setTreasuryOpen: (open: boolean) => void;
  treasuryQuery: string;
  setTreasuryQuery: (value: string) => void;
  treasuryOptions: TreasuryOption[];
  treasuryLoading: boolean;
  setTreasurySelection: (value: TreasuryOption | null) => void;
  treasuryRef: React.RefObject<HTMLDivElement>;
}

export function RebalanceHoldingSheet({
  open,
  onOpenChange,
  editing,
  assetClass,
  onAssetClassChange,
  ticker,
  name,
  qty,
  onTickerChange,
  onNameChange,
  onQtyChange,
  onSubmit,
  pending,
  error,
  comboOpen,
  setComboOpen,
  assetOptions,
  assetLoading,
  comboRef,
  treasuryOpen,
  setTreasuryOpen,
  treasuryQuery,
  setTreasuryQuery,
  treasuryOptions,
  treasuryLoading,
  setTreasurySelection,
  treasuryRef,
}: RebalanceHoldingSheetProps) {
  const isTreasury = assetClass === "tesouro";
  const isFixedIncome = assetClass === "renda_fixa";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{editing ? "Editar posição" : "Adicionar posição"}</SheetTitle>
          <SheetDescription>
            Informe o ativo ou título do Tesouro e a quantidade atual.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="asset-class">
              Classe
            </label>
            <Select
              id="asset-class"
              value={assetClass}
              onValueChange={(value) => onAssetClassChange(value as AssetClass)}
              disabled={editing}
            >
              {ASSET_CLASS_ORDER.map((value) => (
                <SelectItem key={value} value={value}>
                  {ASSET_CLASS_LABELS[value]}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="ticker">
              {isTreasury
                ? "Título do Tesouro"
                : isFixedIncome
                ? "Identificador"
                : "Ticker"}
            </label>
            {isTreasury ? (
              <div ref={treasuryRef} className="relative">
                <Input
                  id="ticker"
                  placeholder="Buscar título"
                  value={treasuryQuery}
                  onFocus={() => setTreasuryOpen(true)}
                  onChange={(event) => {
                    setTreasuryQuery(event.target.value);
                    setTreasurySelection(null);
                    onTickerChange("");
                    onNameChange("");
                  }}
                  required
                  disabled={editing}
                />
                {treasuryOpen ? (
                  <div className="absolute z-[100] mt-2 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-background p-1 shadow-md">
                    {treasuryLoading ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Carregando...
                      </div>
                    ) : treasuryOptions.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum título encontrado.
                      </div>
                    ) : (
                      treasuryOptions.map((option) => {
                        const label = formatTreasuryLabel(
                          option.title_type,
                          option.maturity_date
                        );
                        return (
                          <button
                            key={`${option.title_type}-${option.maturity_date}`}
                            type="button"
                            className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition hover:bg-muted/60"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setTreasurySelection(option);
                              setTreasuryQuery(label);
                              onTickerChange(
                                `TD:${option.title_type}:${option.maturity_date}`
                              );
                              onNameChange(label);
                              setTreasuryOpen(false);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{label}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            ) : isFixedIncome ? (
              <Input
                id="ticker"
                placeholder="Ex: CDB BANCO X 2029"
                value={ticker}
                onChange={(event) => onTickerChange(event.target.value)}
                required
                disabled={editing}
              />
            ) : (
              <div ref={comboRef} className="relative">
                <Input
                  id="ticker"
                  placeholder="Buscar ativo"
                  value={ticker}
                  onFocus={() => setComboOpen(true)}
                  onChange={(event) =>
                    onTickerChange(event.target.value.toUpperCase())
                  }
                  required
                  disabled={editing}
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
                            onTickerChange(asset.ticker);
                            onNameChange(asset.name ?? "");
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
            )}
            {name ? <p className="text-xs text-muted-foreground">{name}</p> : null}
          </div>
          {isFixedIncome ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Nome
              </label>
              <Input
                id="name"
                placeholder="Nome do título"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                required
                disabled={editing}
              />
            </div>
          ) : null}
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
              onChange={(event) => onQtyChange(event.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <SheetFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
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
  );
}
