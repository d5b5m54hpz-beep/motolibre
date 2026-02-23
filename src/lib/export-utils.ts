/**
 * Utilidades de exportación CSV.
 * Formato argentino: separador ;, decimal con coma, BOM UTF-8.
 */

function escapeCSV(val: string): string {
  if (val.includes(";") || val.includes('"') || val.includes("\n")) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function formatDateAR(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function toCSV(
  data: Record<string, unknown>[],
  columns?: { key: string; label: string }[]
): string {
  if (data.length === 0) return "";

  const cols =
    columns ??
    Object.keys(data[0] ?? {}).map((k) => ({ key: k, label: k }));

  const header = cols.map((c) => escapeCSV(c.label)).join(";");

  const rows = data.map((row) =>
    cols
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return "";
        if (val instanceof Date) return formatDateAR(val);
        if (typeof val === "number")
          return val.toString().replace(".", ",");
        return escapeCSV(String(val));
      })
      .join(";")
  );

  // BOM para que Excel reconozca UTF-8
  return "\uFEFF" + header + "\n" + rows.join("\n");
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
