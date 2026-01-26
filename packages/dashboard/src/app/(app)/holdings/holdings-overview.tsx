import { listHoldings } from "@/domains/portfolio/server/holdings";
import { listQuotes } from "@/domains/portfolio/server/quotes";
import { HoldingsTable } from "./holdings-table";

export async function HoldingsOverview() {
  const [holdings, quotes] = await Promise.all([listHoldings(), listQuotes()]);
  const quotesByAssetId = new Map(quotes.map((quote) => [quote.asset_id, quote]));
  const holdingsWithQuotes = holdings.map((holding) => ({
    ...holding,
    quote: quotesByAssetId.get(holding.asset_id) ?? null
  }));

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Carteira</h1>
        <p className="text-sm text-muted-foreground">
          Aqui está o resumo atual da sua carteira.
        </p>
      </div>
      <HoldingsTable holdings={holdingsWithQuotes} />
    </section>
  );
}
