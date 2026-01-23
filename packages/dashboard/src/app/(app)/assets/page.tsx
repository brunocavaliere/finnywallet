import { listAssets } from "@/domains/portfolio/server/assets";

import { AssetsTable } from "./assets-table";

export default async function AssetsPage() {
  const assets = await listAssets();
  const canSeed = process.env.NODE_ENV !== "production";

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Assets</h1>
      <p className="text-sm text-muted-foreground">
        Manage the assets you track in Finny Wallet.
      </p>
      <AssetsTable assets={assets} canSeed={canSeed} />
    </section>
  );
}
