import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/serverClient";

function formatQuery(value: string) {
  return value.trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = formatQuery(url.searchParams.get("query") ?? "");

  const supabase = createServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { data: latestBase, error: latestError } = await supabase
    .from("treasury_prices")
    .select("base_date")
    .order("base_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError || !latestBase?.base_date) {
    return NextResponse.json({ items: [] });
  }

  let requestBuilder = supabase
    .from("treasury_prices")
    .select("title_type, maturity_date")
    .eq("base_date", latestBase.base_date)
    .order("title_type", { ascending: true })
    .order("maturity_date", { ascending: true })
    .limit(200);

  if (query) {
    requestBuilder = requestBuilder.ilike("title_type", `%${query}%`);
  }

  const { data, error } = await requestBuilder;

  if (error) {
    return NextResponse.json(
      { error: "Falha ao buscar títulos do Tesouro." },
      { status: 500 }
    );
  }

  const deduped = new Map<string, { title_type: string; maturity_date: string }>();
  (data ?? []).forEach((item) => {
    const key = `${item.title_type}-${item.maturity_date}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  });

  return NextResponse.json({ items: Array.from(deduped.values()) });
}
