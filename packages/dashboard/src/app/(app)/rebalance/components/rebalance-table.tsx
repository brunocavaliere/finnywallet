"use client";

import type { HoldingWithPrice } from "@/domains/portfolio/types";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";

import type { AssetClass, RebalanceMode, RebalanceRow } from "../utils";
import { formatBRL, formatPercent, toNumber } from "../utils";

interface RebalanceTableProps {
  sections: {
    key: AssetClass;
    label: string;
    holdings: HoldingWithPrice[];
  }[];
  rowsByAssetId: Map<string, RebalanceRow>;
  canCalculate: boolean;
  mode: RebalanceMode;
  pending: boolean;
  sortKey: "value" | "suggestion" | null;
  sortDirection: "asc" | "desc" | null;
  onSort: (key: "value" | "suggestion") => void;
  onEdit: (holding: HoldingWithPrice) => void;
  onDelete: (holding: HoldingWithPrice) => void;
  formatSuggestion: (value: number) => React.ReactNode;
}

export function RebalanceTable({
  sections,
  rowsByAssetId,
  canCalculate,
  mode,
  pending,
  sortKey,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  formatSuggestion,
}: RebalanceTableProps) {
  const renderSortIcon = (key: "value" | "suggestion") => {
    const isActive = sortKey === key;
    const isDesc = isActive && sortDirection === "desc";
    return (
      <ArrowUpDown
        className={`ml-1 h-3.5 w-3.5 transition ${
          isActive ? "text-foreground" : "text-muted-foreground"
        } ${isDesc ? "rotate-180" : ""}`}
      />
    );
  };

  return (
    <div className="h-[calc(100vh-408px)] overflow-auto rounded-md border border-border/40 bg-background/40 pb-4">
      <Accordion
        type="multiple"
        defaultValue={sections.map((section) => section.key)}
      >
        {sections.map((section) => (
          <AccordionItem key={section.key} value={section.key}>
            <AccordionTrigger className="px-4">
              <div className="flex w-full items-center justify-between text-sm">
                <span className="font-medium">{section.label}</span>
                <span className="text-xs text-muted-foreground">
                  {section.holdings.length} ativo(s)
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Preço
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="inline-flex items-center text-right text-sm font-medium text-muted-foreground transition hover:text-foreground"
                        onClick={() => onSort("value")}
                      >
                        Valor
                        {renderSortIcon("value")}
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      % atual
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      % alvo
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="inline-flex items-center text-right text-sm font-semibold text-foreground transition hover:text-foreground"
                        onClick={() => onSort("suggestion")}
                      >
                        {mode === "full" ? "Sugestão" : "Sugestão"}
                        {renderSortIcon("suggestion")}
                      </button>
                    </TableHead>
                    <TableHead className="w-28 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.holdings.map((holding) => {
                    const row = rowsByAssetId.get(holding.asset_id);
                    const currentPercent =
                      canCalculate && row
                        ? formatPercent(row.currentPercent)
                        : "—";
                    const targetPercent =
                      canCalculate && row
                        ? formatPercent(row.targetPercent)
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
                          toNumber(holding.qty) * toNumber(holding.price.price)
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
                          {suggestion}
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider delayDuration={150}>
                            <div className="flex justify-end gap-3">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    onClick={() => onEdit(holding)}
                                    disabled={pending}
                                    aria-label="Editar posição"
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
                                    onClick={() => onDelete(holding)}
                                    disabled={pending}
                                    aria-label="Remover posição"
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
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
