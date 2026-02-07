import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/serverClient";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() ?? "";

  const supabase = createServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  const { data, error } = await supabase
    .from("b3_assets")
    .select("ticker, name, category")
    .or(`ticker.ilike.%${query}%,name.ilike.%${query}%`)
    .limit(25);

  if (error) {
    return NextResponse.json(
      { error: "Falha ao buscar ativos." },
      { status: 500 }
    );
  }

  const items = (data ?? []).filter((item) =>
    /^[A-Z]{4,6}\d{1,2}$/.test(item.ticker)
  );

  return NextResponse.json({ items });
}
