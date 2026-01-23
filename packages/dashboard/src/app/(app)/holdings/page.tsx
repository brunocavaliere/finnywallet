import { listAssets } from "@/domains/portfolio/server/assets";
import { listHoldings } from "@/domains/portfolio/server/holdings";

import { HoldingsTable } from "./holdings-table";

export default async function HoldingsPage() {
  const [assets, holdings] = await Promise.all([listAssets(), listHoldings()]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Holdings</h1>
      <p className="text-sm text-muted-foreground">
        Record your current positions and quantities.
      </p>
      <HoldingsTable holdings={holdings} assets={assets} />
    </section>
  );
}
