const fs = require("fs");
const path = require("path");
const readline = require("readline");

const SOURCE_PATH = path.resolve(
  __dirname,
  "../../data/b3/Cadastro de instrumentos-29-01-2026.csv"
);
const OUTPUT_PATH = path.resolve(__dirname, "../../data/b3/b3_assets_filtered.csv");

const allowedCategories = new Set([
  "SHARES",
  "FUNDS",
  "ETF EQUITIES",
  "ETF FOREIGN INDEX",
  "BDR",
  "UNIT"
]);

function parseLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ";" && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}

async function run() {
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`Arquivo não encontrado: ${SOURCE_PATH}`);
    process.exit(1);
  }

  const stream = fs.createReadStream(SOURCE_PATH, { encoding: "latin1" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header = null;
  let headerIndex = {};
  const rows = new Map();

  for await (const line of rl) {
    if (!header) {
      if (!line.includes("Instrumento financeiro;")) {
        continue;
      }
      header = parseLine(line);
      header.forEach((col, idx) => {
        headerIndex[col.trim()] = idx;
      });
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    const cols = parseLine(line);
    const category = cols[headerIndex["Categoria"]] || "";
    if (!allowedCategories.has(category.trim())) {
      continue;
    }

    const ticker = (cols[headerIndex["Instrumento financeiro"]] || "").trim();
    if (!ticker || ticker === "-") {
      continue;
    }

    if (rows.has(ticker)) {
      continue;
    }

    const row = {
      ticker,
      asset_code: (cols[headerIndex["Ativo"]] || "").trim() || null,
      name: (cols[headerIndex["Descrição do ativo"]] || "").trim() || null,
      segment: (cols[headerIndex["Segmento"]] || "").trim() || null,
      market: (cols[headerIndex["Mercado"]] || "").trim() || null,
      category: category.trim() || null,
      isin: (cols[headerIndex["Código ISIN"]] || "").trim() || null,
      cfi: (cols[headerIndex["Código CFI"]] || "").trim() || null,
      lot_size: (cols[headerIndex["Tamanho de lote de alocação"]] || "").trim(),
      currency: (cols[headerIndex["Moeda negociada"]] || "").trim() || null,
      spec_code: (cols[headerIndex["Código de especificação"]] || "").trim() || null,
      institution_name: (cols[headerIndex["Nome da instituição"]] || "").trim() || null,
      governance:
        (cols[headerIndex["Nível de governança corporativa"]] || "").trim() ||
        null
    };

    rows.set(ticker, row);
  }

  const headers = [
    "ticker",
    "asset_code",
    "name",
    "segment",
    "market",
    "category",
    "isin",
    "cfi",
    "lot_size",
    "currency",
    "spec_code",
    "institution_name",
    "governance"
  ];

  const outputLines = [headers.join(";")];
  for (const row of rows.values()) {
    const line = headers
      .map((key) => {
        const value = row[key];
        if (value === null || value === undefined) {
          return "";
        }
        const stringValue = String(value);
        if (stringValue.includes(";") || stringValue.includes("\"")) {
          return `"${stringValue.replace(/\"/g, "\"\"")}"`;
        }
        return stringValue;
      })
      .join(";");
    outputLines.push(line);
  }

  fs.writeFileSync(OUTPUT_PATH, outputLines.join("\n"), "utf8");
  console.log(`Gerado: ${OUTPUT_PATH} (${rows.size} ativos)`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
