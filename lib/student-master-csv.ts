export type CsvRow = Record<string, string>;

export type ParsedCsv = {
  headers: string[];
  rows: CsvRow[];
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseCsvCells(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      row.push(cell.trim());
      cell = "";
      const hasValues = row.some((value) => value.length > 0);
      if (hasValues) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    const hasValues = row.some((value) => value.length > 0);
    if (hasValues) {
      rows.push(row);
    }
  }

  return rows;
}

export function parseStudentMasterCsv(text: string): ParsedCsv {
  const rawRows = parseCsvCells(text);
  if (rawRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...valueRows] = rawRows;
  const headers = headerRow.map(normalizeHeader).filter((header) => header.length > 0);

  const rows: CsvRow[] = valueRows.map((cells) => {
    const entry: CsvRow = {};
    headers.forEach((header, index) => {
      entry[header] = (cells[index] ?? "").trim();
    });
    return entry;
  });

  return { headers, rows };
}
