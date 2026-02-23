import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { matchManualSchema } from "@/lib/validations/conciliacion";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.match,
    "canApprove",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = matchManualSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { extractoId, entidadTipo, entidadId } = parsed.data;

  try {
    // Verificar que la conciliacion existe y esta en proceso
    const conciliacion = await prisma.conciliacion.findUnique({
      where: { id },
    });
    if (!conciliacion) {
      return NextResponse.json(
        { error: "Conciliacion no encontrada" },
        { status: 404 }
      );
    }
    if (conciliacion.estado !== "EN_PROCESO") {
      return NextResponse.json(
        { error: "La conciliacion no esta en proceso" },
        { status: 422 }
      );
    }

    // Obtener el extracto bancario
    const extracto = await prisma.extractoBancario.findUnique({
      where: { id: extractoId },
    });
    if (!extracto) {
      return NextResponse.json(
        { error: "Extracto bancario no encontrado" },
        { status: 404 }
      );
    }

    // Obtener la entidad interna y calcular monto del sistema
    let montoSistema: number;
    let entidadLabel: string;

    switch (entidadTipo) {
      case "PagoMercadoPago": {
        const pago = await prisma.pagoMercadoPago.findUnique({
          where: { id: entidadId },
        });
        if (!pago) {
          return NextResponse.json(
            { error: "PagoMercadoPago no encontrado" },
            { status: 404 }
          );
        }
        montoSistema = Number(pago.monto);
        entidadLabel = `Pago MP-${pago.mpPaymentId ?? pago.id}`;
        break;
      }

      case "Gasto": {
        const gasto = await prisma.gasto.findUnique({
          where: { id: entidadId },
        });
        if (!gasto) {
          return NextResponse.json(
            { error: "Gasto no encontrado" },
            { status: 404 }
          );
        }
        montoSistema = -Number(gasto.monto);
        entidadLabel = gasto.descripcion;
        break;
      }

      case "FacturaCompra": {
        const factura = await prisma.facturaCompra.findUnique({
          where: { id: entidadId },
        });
        if (!factura) {
          return NextResponse.json(
            { error: "FacturaCompra no encontrada" },
            { status: 404 }
          );
        }
        montoSistema = -Number(factura.montoTotal);
        entidadLabel = `${factura.numeroCompleto} — ${factura.proveedorNombre}`;
        break;
      }

      case "ReciboSueldo": {
        const recibo = await prisma.reciboSueldo.findUnique({
          where: { id: entidadId },
          include: {
            empleado: { select: { nombre: true, apellido: true } },
          },
        });
        if (!recibo) {
          return NextResponse.json(
            { error: "ReciboSueldo no encontrado" },
            { status: 404 }
          );
        }
        montoSistema = -Number(recibo.netoAPagar);
        entidadLabel = `${recibo.numero} — ${recibo.empleado.nombre} ${recibo.empleado.apellido}`;
        break;
      }

      default:
        return NextResponse.json(
          { error: `Tipo de entidad no soportado: ${entidadTipo}` },
          { status: 400 }
        );
    }

    const diferencia = Math.round((Number(extracto.monto) - montoSistema) * 100) / 100;

    // Crear match y actualizar extracto/conciliacion en transaccion
    const match = await prisma.$transaction(async (tx) => {
      const newMatch = await tx.conciliacionMatch.create({
        data: {
          conciliacionId: id,
          extractoId,
          entidadTipo,
          entidadId,
          entidadLabel,
          tipoMatch: "MANUAL",
          estado: "APROBADO",
          confianza: 100,
          montoBanco: extracto.monto,
          montoSistema,
          diferencia,
          aprobadoPor: session?.user?.id,
          fechaAprobacion: new Date(),
        },
      });

      await tx.extractoBancario.update({
        where: { id: extractoId },
        data: {
          conciliado: true,
          conciliacionMatchId: newMatch.id,
        },
      });

      await tx.conciliacion.update({
        where: { id },
        data: {
          totalConciliados: { increment: 1 },
          totalNoConciliados: { decrement: 1 },
        },
      });

      return newMatch;
    });

    return NextResponse.json({ data: match }, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al crear match manual";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
