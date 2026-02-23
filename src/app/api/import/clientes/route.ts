import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events/operations";
import { prisma } from "@/lib/prisma";
import { parseCSV, validarFilas } from "@/lib/import-utils";

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
      if (!row["Nombre"]?.trim()) return `Fila ${fila}: Nombre requerido`;
      if (!row["Apellido"]?.trim()) return `Fila ${fila}: Apellido requerido`;
      if (!row["DNI"]?.trim()) return `Fila ${fila}: DNI requerido`;
      return null;
    });

    // Check existing DNIs in batch
    const dnis = validas.map((r) => r["DNI"]!.trim());
    const existentesDB = await prisma.cliente.findMany({
      where: { dni: { in: dnis } },
      select: { dni: true },
    });
    const dniSet = new Set(existentesDB.map((c) => c.dni));

    let importados = 0;
    let existentes = 0;

    for (const row of validas) {
      const dni = row["DNI"]!.trim();
      if (dniSet.has(dni)) {
        existentes++;
        continue;
      }

      await prisma.cliente.create({
        data: {
          nombre: row["Nombre"]!.trim(),
          apellido: row["Apellido"]!.trim(),
          dni,
          email: row["Email"]?.trim() || `${dni}@sin-email.local`,
          telefono: row["Telefono"]?.trim() || row["Teléfono"]?.trim() || "",
          calle: row["Direccion"]?.trim() || row["Dirección"]?.trim() || null,
          estado: "PENDIENTE",
        },
      });
      importados++;
    }

    return NextResponse.json({
      importados,
      existentes,
      errores,
      total: rows.length,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Error procesando CSV" },
      { status: 500 }
    );
  }
}
