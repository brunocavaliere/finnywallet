import type { Hono } from "hono";

const CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

const HEADER_MAP: Record<string, string> = {
  "tipo titulo": "title_type",
  "data vencimento": "maturity_date",
  "data base": "base_date",
  "taxa compra manha": "buy_rate",
  "taxa venda manha": "sell_rate",
  "pu compra manha": "buy_price",
  "pu venda manha": "sell_price",
  "pu base manha": "base_price"
};

type TreasuryRow = {
  title_type: string;
  maturity_date: string;
  base_date: string;
  buy_rate: number | null;
  sell_rate: number | null;
  buy_price: number | null;
  sell_price: number | null;
  base_price: number | null;
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parsePtNumber(value: string | undefined) {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateBr(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [day, month, year] = trimmed.split("/");
  if (!day || !month || !year) return null;
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(
    2,
    "0"
  )}`;
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  return firstLine.includes(";") ? ";" : ",";
}

function parseCSVRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = "";
  };

  const pushRow = () => {
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    currentRow = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && next === '"') {
      currentField += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      pushField();
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      pushField();
      pushRow();
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
}

async function supabaseRequest(
  path: string,
  init: RequestInit = {}
) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase configuration.");
  }

  const url = `${supabaseUrl}/rest/v1/${path}`;
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey);
  headers.set("authorization", `Bearer ${serviceKey}`);

  return fetch(url, { ...init, headers });
}

async function fetchLatestBaseDate() {
  const response = await supabaseRequest(
    "treasury_prices?select=base_date&order=base_date.desc&limit=1"
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { base_date?: string }[];
  return data?.[0]?.base_date ?? null;
}

async function upsertBatch(rows: TreasuryRow[]) {
  if (rows.length === 0) return;
  const response = await supabaseRequest(
    "treasury_prices?on_conflict=title_type,maturity_date,base_date",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(rows)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to upsert treasury prices.");
  }
}

export function registerTreasuryRoutes(app: Hono) {
  app.post("/jobs/treasury-refresh", async (c) => {
    const secret = process.env.JOB_SECRET;
    const provided = c.req.header("x-job-secret");

    if (!secret || !provided || provided !== secret) {
      return c.json({ ok: false, error: "Unauthorized." }, 401);
    }

    const response = await fetch(CSV_URL, {
      headers: {
        "user-agent":
          "FinnyWallet/1.0 (+https://localhost; treasury-prices-ingest)"
      }
    });
    if (!response.ok) {
      return c.json(
        { ok: false, error: "Falha ao baixar o CSV do Tesouro." },
        502
      );
    }

    const text = await response.text();
    const delimiter = detectDelimiter(text);
    const rows = parseCSVRows(text, delimiter);

    if (rows.length === 0) {
      return c.json({ ok: false, error: "CSV vazio." }, 500);
    }

    const headers = rows[0].map((header) => normalizeHeader(header));
    const indexMap = new Map<string, number>();
    headers.forEach((header, index) => {
      const mapped = HEADER_MAP[header];
      if (mapped) {
        indexMap.set(mapped, index);
      }
    });

    const required = ["title_type", "maturity_date", "base_date"];
    for (const field of required) {
      if (!indexMap.has(field)) {
        return c.json(
          { ok: false, error: `Coluna ausente no CSV: ${field}` },
          500
        );
      }
    }

    const latestBaseDate = await fetchLatestBaseDate();
    const batch: TreasuryRow[] = [];
    let inserted = 0;
    let skipped = 0;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const titleType = row[indexMap.get("title_type")!]?.trim();
      const maturityDate = parseDateBr(
        row[indexMap.get("maturity_date")!]
      );
      const baseDate = parseDateBr(row[indexMap.get("base_date")!]);

      if (!titleType || !maturityDate || !baseDate) {
        continue;
      }

      if (latestBaseDate && baseDate <= latestBaseDate) {
        skipped += 1;
        continue;
      }

      batch.push({
        title_type: titleType,
        maturity_date: maturityDate,
        base_date: baseDate,
        buy_rate: parsePtNumber(row[indexMap.get("buy_rate")!]),
        sell_rate: parsePtNumber(row[indexMap.get("sell_rate")!]),
        buy_price: parsePtNumber(row[indexMap.get("buy_price")!]),
        sell_price: parsePtNumber(row[indexMap.get("sell_price")!]),
        base_price: parsePtNumber(row[indexMap.get("base_price")!])
      });

      if (batch.length >= 1000) {
        await upsertBatch(batch);
        inserted += batch.length;
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await upsertBatch(batch);
      inserted += batch.length;
    }

    return c.json({
      ok: true,
      inserted,
      skipped,
      latestBaseDate
    });
  });
}
