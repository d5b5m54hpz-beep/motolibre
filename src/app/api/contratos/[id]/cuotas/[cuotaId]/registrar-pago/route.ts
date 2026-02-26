import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { crearAlerta } from "@/lib/alertas-utils";
import { z } from "zod";

const schema = z.object({
  monto: z.number().positive("El monto debe ser mayor a 0"),
  metodoPago: z.enum(["TRANSFERENCIA", "EFECTIVO", "CHEQUE", "AJUSTE", "OTRO"]),
  referenciaPago: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  fecha: z.string().optional().nullable(), // ISO date string
});

/**
 * POST /api/contratos/[id]/cuotas/[cuotaId]/registrar-pago
 * Manually register a payment for a cuota (offline/cash/transfer/adjustment).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cuotaId: string }> }
) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!["ADMIN", "COMERCIAL"].includes(session.user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { id: contratoId, cuotaId } = await params;

  const cuota = await prisma.cuota.findUnique({
    where: { id: cuotaId },
    include: {
      contrato: {
        include: {
          cliente: { select: { nombre: true, apellido: true } },
        },
      },
    },
  });

  if (!cuota) {
    return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
  }

  if (cuota.contratoId !== contratoId) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  if (!["PENDIENTE", "VENCIDA", "PARCIAL"].includes(cuota.estado)) {
    return NextResponse.json(
      { error: "La cuota ya fue pagada o cancelada" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { monto, metodoPago, referenciaPago, notas, fecha } = parsed.data;
  const montoCuota = Number(cuota.monto);
  const montoPagadoPrevio = Number(cuota.montoPagado ?? 0);
  const montoTotalAcumulado = montoPagadoPrevio + monto;
  const fechaPago = fecha ? new Date(fecha) : new Date();

  const nuevoEstado =
    montoTotalAcumulado >= montoCuota ? "PAGADA" : "PARCIAL";

  const cuotaActualizada = await prisma.cuota.update({
    where: { id: cuotaId },
    data: {
      estado: nuevoEstado,
      fechaPago: nuevoEstado === "PAGADA" ? fechaPago : cuota.fechaPago,
      montoPagado: montoTotalAcumulado,
      metodoPago,
      referenciaPago: referenciaPago ?? null,
      registradoPor: session.user.id,
      notas: notas ?? cuota.notas,
    },
  });

  // Create in-app alert
  const clienteNombre = `${cuota.contrato.cliente.nombre} ${cuota.contrato.cliente.apellido}`;
  await crearAlerta({
    tipo: "PAGO_RECIBIDO",
    titulo: `Pago manual registrado — ${clienteNombre}`,
    mensaje: `Cuota #${cuota.numero} | $${monto.toLocaleString("es-AR")} vía ${metodoPago}${referenciaPago ? ` (Ref: ${referenciaPago})` : ""}`,
    prioridad: "BAJA",
    modulo: "comercial",
    entidadTipo: "Contrato",
    entidadId: contratoId,
    usuarioId: session.user.id,
    accionUrl: `/admin/contratos/${contratoId}`,
    accionLabel: "Ver contrato",
  });

  return NextResponse.json({ data: cuotaActualizada });
}
