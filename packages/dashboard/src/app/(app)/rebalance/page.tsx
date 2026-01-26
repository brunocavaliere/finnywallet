import { listHoldings } from "@/domains/portfolio/server/holdings";
import { listQuotes } from "@/domains/portfolio/server/quotes";
import { listTargets } from "@/domains/portfolio/server/targets";

import { RebalanceClient } from "./rebalance-client";

export default async function RebalancePage() {
  const [holdings, targets, quotes] = await Promise.all([
    listHoldings(),
    listTargets(),
    listQuotes()
  ]);

  const quotesByAssetId = new Map(quotes.map((quote) => [quote.asset_id, quote]));
  const holdingsWithQuotes = holdings.map((holding) => ({
    ...holding,
    quote: quotesByAssetId.get(holding.asset_id) ?? null
  }));

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Rebalanceamento</h1>
        <p className="text-sm text-muted-foreground">
          Use o aporte para aproximar sua carteira das metas definidas.
        </p>
      </div>
      <RebalanceClient holdings={holdingsWithQuotes} targets={targets} />
    </section>
  );
}
