import { listHoldings } from "@/domains/portfolio/server/holdings";
import { listAssetPrices } from "@/domains/portfolio/server/asset-prices";
import { HoldingsTable } from "./holdings-table";

export async function HoldingsOverview() {
  const holdings = await listHoldings();
  const tickers = holdings.map((holding) => holding.asset.ticker);
  const prices = await listAssetPrices(tickers);
  const pricesByTicker = new Map(
    prices.map((price) => [price.ticker, price])
  );
  const holdingsWithQuotes = holdings.map((holding) => ({
    ...holding,
    price: pricesByTicker.get(holding.asset.ticker) ?? null
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
