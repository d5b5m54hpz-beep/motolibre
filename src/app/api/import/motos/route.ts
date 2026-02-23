import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events/operations";
import { prisma } from "@/lib/prisma";
import { parseCSV, validarFilas } from "@/lib/import-utils";

const VALID_TIPOS = ["NAKED", "TOURING", "SPORT", "SCOOTER", "CUSTOM"] as const;

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.system.config.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  try {
    const csv = await req.text();
    const { rows } = parseCSV(csv);

    const { validas, errores } = validarFilas(rows, (row, fila) => {
      if (!row["Patente"]?.trim()) return `Fila ${fila}: Patente requerida`;
      if (!row["Marca"]?.trim()) return `Fila ${fila}: Marca requerida`;
      if (!row["Modelo"]?.trim()) return `Fila ${fila}: Modelo requerido`;
      const anio = parseInt(row["Ano"] || row["Año"] || "");
      if (isNaN(anio)) return `Fila ${fila}: Ano debe ser un numero valido`;
      return null;
    });

    // Check existing patentes in batch
    const patentes = validas.map((r) =>
      r["Patente"]!.trim().toUpperCase()
    );
    const existentes = await prisma.moto.findMany({
      where: { patente: { in: patentes } },
      select: { patente: true },
    });
    const patenteSet = new Set(existentes.map((m) => m.patente));

    let importados = 0;
    for (const row of validas) {
      const patente = row["Patente"]!.trim().toUpperCase();
      if (patenteSet.has(patente)) {
        errores.push({ fila: 0, error: `Patente ${patente} ya existe` });
        continue;
      }

      const tipoRaw = (row["Tipo"] || "").trim().toUpperCase();
      const tipo = (VALID_TIPOS as readonly string[]).includes(tipoRaw)
        ? (tipoRaw as (typeof VALID_TIPOS)[number])
        : "NAKED";

      await prisma.moto.create({
        data: {
          patente,
          marca: row["Marca"]!.trim(),
          modelo: row["Modelo"]!.trim(),
          anio:
            parseInt(row["Ano"] || row["Año"] || "") ||
            new Date().getFullYear(),
          km: parseInt(row["Km"] || "") || 0,
          cilindrada: parseInt(row["Cilindrada"] || "") || null,
          color: row["Color"]?.trim() || null,
          tipo,
          estado: "DISPONIBLE",
        },
      });
      importados++;
    }

    return NextResponse.json({ importados, errores, total: rows.length });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Error procesando CSV" },
      { status: 500 }
    );
  }
}
