import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { apiSetup } from "@/lib/api-helpers";
import { parsearCSVExtracto } from "@/lib/conciliacion-utils";

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.import,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const { cuentaBancariaId, csv } = body as {
    cuentaBancariaId: string;
    csv: string;
  };

  if (!cuentaBancariaId || !csv) {
    return NextResponse.json(
      { error: "cuentaBancariaId y csv son requeridos" },
      { status: 400 }
    );
  }

  // Verificar que la cuenta existe
  const cuenta = await prisma.cuentaBancaria.findUnique({
    where: { id: cuentaBancariaId },
  });
  if (!cuenta) {
    return NextResponse.json(
      { error: "Cuenta bancaria no encontrada" },
      { status: 404 }
    );
  }

  // Parsear CSV
  const errores: string[] = [];
  let rows;
  try {
    rows = parsearCSVExtracto(csv);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al parsear CSV";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron filas válidas en el CSV" },
      { status: 400 }
    );
  }

  // Preparar datos para inserción, validando cada fila
  const datosValidos: {
    cuentaBancariaId: string;
    fecha: Date;
    descripcion: string;
    referencia: string | null;
    monto: number;
    saldo: number | null;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      if (!row.descripcion || row.descripcion.trim() === "") {
        errores.push(`Fila ${i + 1}: descripción vacía`);
        continue;
      }
      if (isNaN(row.monto) || row.monto === 0) {
        errores.push(`Fila ${i + 1}: monto inválido o cero`);
        continue;
      }
      datosValidos.push({
        cuentaBancariaId,
        fecha: row.fecha,
        descripcion: row.descripcion,
        referencia: row.referencia,
        monto: row.monto,
        saldo: row.saldo,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      errores.push(`Fila ${i + 1}: ${message}`);
    }
  }

  // Insertar en batch
  let importados = 0;
  if (datosValidos.length > 0) {
    const result = await prisma.extractoBancario.createMany({
      data: datosValidos,
    });
    importados = result.count;
  }

  const { eventBus } = await import("@/lib/events/event-bus");
  await eventBus.emit(
    OPERATIONS.finance.bankReconciliation.import,
    "ExtractoBancario",
    cuentaBancariaId,
    { importados, errores: errores.length, cuenta: cuenta.nombre },
    session?.user?.id
  );

  return NextResponse.json({ importados, errores }, { status: 201 });
}
