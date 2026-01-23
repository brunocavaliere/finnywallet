import { listAssets } from "@/domains/portfolio/server/assets";
import { listTargets } from "@/domains/portfolio/server/targets";

import { TargetsTable } from "./targets-table";

export default async function TargetsPage() {
  const [assets, targets] = await Promise.all([listAssets(), listTargets()]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Targets</h1>
      <p className="text-sm text-muted-foreground">
        Define your desired allocation percentages.
      </p>
      <TargetsTable targets={targets} assets={assets} />
    </section>
  );
}
