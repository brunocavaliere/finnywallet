import { listHoldings } from "@/domains/portfolio/server/holdings";
import { HoldingsTable } from "./holdings-table";

export async function HoldingsOverview() {
  const holdings = await listHoldings();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Carteira</h1>
        <p className="text-sm text-muted-foreground">
          Aqui está o resumo atual da sua carteira.
        </p>
      </div>
      <HoldingsTable holdings={holdings} />
    </section>
  );
}
