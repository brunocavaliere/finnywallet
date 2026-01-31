import { listHoldings } from "@/domains/portfolio/server/holdings";
import { listAssetPrices } from "@/domains/portfolio/server/asset-prices";
import { listTargets } from "@/domains/portfolio/server/targets";

import { RebalanceClient } from "./rebalance-client";

export async function RebalanceView() {
  const [holdings, targets] = await Promise.all([
    listHoldings(),
    listTargets()
  ]);
  const tickers = holdings.map((holding) => holding.asset.ticker);
  const prices = await listAssetPrices(tickers);
  const pricesByTicker = new Map(
    prices.map((price) => [price.ticker, price])
  );
  const holdingsWithPrices = holdings.map((holding) => ({
    ...holding,
    price: pricesByTicker.get(holding.asset.ticker) ?? null
  }));

  return (
    <section className="flex h-full flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Rebalanceamento</h1>
        <p className="text-sm text-muted-foreground">
          Ajuste posições e metas para equilibrar sua carteira.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <RebalanceClient holdings={holdingsWithPrices} targets={targets} />
      </div>
    </section>
  );
}
