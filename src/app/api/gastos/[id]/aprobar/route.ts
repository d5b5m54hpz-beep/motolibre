import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { gastoAprobarSchema } from "@/lib/validations/gasto";
import { categoriaToCuentaContable } from "@/lib/gastos-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.finance.expense.approve,
    "canApprove",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = gastoAprobarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const gasto = await prisma.gasto.findUnique({ where: { id } });
  if (!gasto) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  }
  if (gasto.estado !== "PENDIENTE") {
    return NextResponse.json(
      { error: `No se puede aprobar/rechazar gasto en estado ${gasto.estado}` },
      { status: 422 }
    );
  }

  if (parsed.data.aprobado) {
    const updated = await prisma.gasto.update({
      where: { id },
      data: {
        estado: "APROBADO",
        aprobadoPor: userId,
        aprobadoAt: new Date(),
      },
    });

    // Actualizar presupuesto ejecutado si existe
    const fecha = gasto.fecha;
    await prisma.presupuestoMensual.updateMany({
      where: {
        anio: fecha.getFullYear(),
        mes: fecha.getMonth() + 1,
        categoria: gasto.categoria,
      },
      data: { montoEjecutado: { increment: gasto.monto } },
    });

    // Emitir evento para handler contable
    const cuentaContable = categoriaToCuentaContable(gasto.categoria);
    await eventBus.emit(
      OPERATIONS.finance.expense.create,
      "Gasto",
      id,
      {
        monto: Number(gasto.monto),
        cuentaContable,
        medioPago: gasto.medioPago,
        descripcion: gasto.descripcion,
      },
      userId
    ).catch((err) => console.error("[Gastos] Error emitiendo evento contable:", err));

    return NextResponse.json({ data: updated });
  } else {
    const updated = await prisma.gasto.update({
      where: { id },
      data: { estado: "RECHAZADO" },
    });
    return NextResponse.json({ data: updated });
  }
}
