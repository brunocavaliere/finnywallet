import { listHoldings } from "@/domains/portfolio/server/holdings";
import { listTargets } from "@/domains/portfolio/server/targets";
import { TargetsTable } from "./targets-table";

export default async function TargetsPage() {
  const [holdings, targets] = await Promise.all([
    listHoldings(),
    listTargets()
  ]);

  const assetMap = new Map(holdings.map((holding) => [holding.asset.id, holding.asset]));
  const assets = Array.from(assetMap.values());
  const assetIds = new Set(assets.map((asset) => asset.id));
  const filteredTargets = targets.filter((target) =>
    assetIds.has(target.asset_id)
  );

  return (
    <section className="flex h-full flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Metas</h1>
        <p className="text-sm text-muted-foreground">
          Defina os percentuais desejados de alocação.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <TargetsTable targets={filteredTargets} assets={assets} />
      </div>
    </section>
  );
}
