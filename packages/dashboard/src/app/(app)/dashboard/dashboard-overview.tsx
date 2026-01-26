import Link from "next/link";

import { listHoldings } from "@/domains/portfolio/server/holdings";
import { listQuotes } from "@/domains/portfolio/server/quotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type HoldingWithValue = {
  id: string;
  asset: { ticker: string; name: string | null };
  qty: number;
  price: number;
  value: number;
};

function safeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatBRL(value: number): string {
  const safeValue = safeNumber(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(safeValue);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function resolveLatestUpdate(quotes: { as_of: string }[]) {
  return quotes.reduce<Date | null>((latest, quote) => {
    const date = new Date(quote.as_of);
    if (Number.isNaN(date.getTime())) {
      return latest;
    }
    if (!latest || date > latest) {
      return date;
    }
    return latest;
  }, null);
}

export async function DashboardOverview() {
  const [holdings, quotes] = await Promise.all([listHoldings(), listQuotes()]);
  const quotesByAssetId = new Map(quotes.map((quote) => [quote.asset_id, quote]));

  const holdingsWithValue = holdings.map((holding) => {
    const quote = quotesByAssetId.get(holding.asset_id);
    const qty = safeNumber(holding.qty);
    const price = safeNumber(quote?.price);
    const value = qty * price;

    return {
      id: holding.id,
      asset: holding.asset,
      qty,
      price,
      value
    } satisfies HoldingWithValue;
  });

  const totalValue = holdingsWithValue.reduce(
    (sum, holding) => sum + holding.value,
    0
  );
  const pricedPositions = holdingsWithValue.filter(
    (holding) => holding.price > 0
  );
  const latestUpdate = resolveLatestUpdate(quotes);
  const topPositions = [...holdingsWithValue]
    .filter((holding) => holding.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Visão geral</h1>
          <p className="text-sm text-muted-foreground">
            Um panorama rápido da sua carteira.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/holdings">Ver posições</Link>
        </Button>
      </div>

      {holdings.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          <p>Sua carteira ainda está vazia.</p>
          <Button asChild>
            <Link href="/holdings">Adicionar primeira posição</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Valor atualizado</CardDescription>
                <CardTitle className="text-2xl">{formatBRL(totalValue)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Baseado nos preços disponíveis.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Posições ativas</CardDescription>
                <CardTitle className="text-2xl">{holdings.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {pricedPositions.length} com preço atualizado.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Última atualização</CardDescription>
                <CardTitle className="text-2xl">
                  {latestUpdate ? formatDateTime(latestUpdate) : "Sem preços"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Atualize os preços para manter o panorama em dia.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Maiores posições</CardTitle>
              <CardDescription>
                Top 3 posições pelo valor atualizado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {topPositions.length === 0 ? (
                <p className="text-muted-foreground">
                  Nenhuma posição com preço disponível no momento.
                </p>
              ) : (
                topPositions.map((holding) => (
                  <div
                    key={holding.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-medium">{holding.asset.ticker}</div>
                      {holding.asset.name ? (
                        <div className="text-xs text-muted-foreground">
                          {holding.asset.name}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatBRL(holding.value)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {holding.qty} x {formatBRL(holding.price)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
