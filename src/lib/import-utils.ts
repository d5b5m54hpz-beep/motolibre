/**
 * Utilidades de importación CSV.
 * Parsea formato argentino: separador ;, decimal con coma, fecha DD/MM/YYYY.
 */

function parseLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === sep && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(csv: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = csv.replace(/^\uFEFF/, "").trim().split("\n");
  if (lines.length < 2) throw new Error("CSV vacío o sin datos");

  const firstLine = lines[0]!;
  const separator = firstLine.includes(";") ? ";" : ",";
  const headers = parseLine(firstLine, separator);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    const values = parseLine(line, separator);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

export function validarFilas(
  rows: Record<string, string>[],
  validar: (row: Record<string, string>, index: number) => string | null
): {
  validas: Record<string, string>[];
  errores: { fila: number; error: string }[];
} {
  const validas: Record<string, string>[] = [];
  const errores: { fila: number; error: string }[] = [];

  rows.forEach((row, idx) => {
    const error = validar(row, idx + 2); // +2 por header + 0-indexed
    if (error) errores.push({ fila: idx + 2, error });
    else validas.push(row);
  });

  return { validas, errores };
}

export function parseNumeroAR(val: string): number {
  if (!val) return 0;
  return parseFloat(val.replace(/\./g, "").replace(",", "."));
}

export function parseFechaAR(val: string): Date | null {
  if (!val) return null;
  const [d, m, y] = val.split("/");
  if (!d || !m || !y) return null;
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}
