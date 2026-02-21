import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { generarFechasCuotas } from "@/lib/contrato-utils";
import { generarFechasMantenimiento } from "@/lib/mantenimiento-utils";
import { planToMeses } from "@/lib/pricing-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.solicitud.deliver,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const solicitud = await prisma.solicitud.findUnique({
    where: { id },
    include: { cliente: true, moto: true },
  });

  if (!solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }
  if (solicitud.estado !== "ASIGNADA") {
    return NextResponse.json(
      { error: `Solo solicitudes ASIGNADAS pueden entregarse. Estado actual: ${solicitud.estado}` },
      { status: 422 }
    );
  }
  if (!solicitud.motoAsignadaId || !solicitud.moto) {
    return NextResponse.json({ error: "Solicitud sin moto asignada" }, { status: 422 });
  }

  const fechaEntrega = new Date();
  const duracionMeses = planToMeses(solicitud.plan);
  const esLeaseToOwn = solicitud.plan === "MESES_24";
  const frecuenciaInicial = "SEMANAL" as const;
  const montoPeriodoSemanal = Number(solicitud.precioSemanal);

  const fechasCuotas = generarFechasCuotas(fechaEntrega, duracionMeses, frecuenciaInicial);
  const fechasMantenimiento = generarFechasMantenimiento(fechaEntrega, duracionMeses);

  const fechaFin = new Date(fechaEntrega);
  fechaFin.setMonth(fechaFin.getMonth() + duracionMeses);

  const result = await prisma.$transaction(async (tx) => {
    const contrato = await tx.contrato.create({
      data: {
        clienteId: solicitud.clienteId,
        motoId: solicitud.motoAsignadaId!,
        estado: "ACTIVO",
        fechaInicio: fechaEntrega,
        fechaFin,
        fechaActivacion: fechaEntrega,
        frecuenciaPago: frecuenciaInicial,
        montoPeriodo: montoPeriodoSemanal,
        deposito: solicitud.montoPrimerMes,
        depositoDevuelto: false,
        duracionMeses,
        tieneOpcionCompra: esLeaseToOwn,
        esLeaseToOwn,
        renovacionAuto: false,
        creadoPor: userId,
      },
    });

    await tx.cuota.createMany({
      data: fechasCuotas.map((fecha, i) => ({
        contratoId: contrato.id,
        numero: i + 1,
        monto: montoPeriodoSemanal,
        fechaVencimiento: fecha,
      })),
    });

    await tx.moto.update({
      where: { id: solicitud.motoAsignadaId! },
      data: { estado: "ALQUILADA" },
    });

    await tx.historialEstadoMoto.create({
      data: {
        motoId: solicitud.motoAsignadaId!,
        estadoAnterior: "RESERVADA",
        estadoNuevo: "ALQUILADA",
        motivo: `Entregada al rider — contrato ${contrato.id}`,
        userId: userId!,
      },
    });

    await tx.mantenimientoProgramado.createMany({
      data: fechasMantenimiento.map((fecha, i) => ({
        contratoId: contrato.id,
        motoId: solicitud.motoAsignadaId!,
        clienteId: solicitud.clienteId,
        numero: i + 1,
        fechaProgramada: fecha,
      })),
    });

    const solicitudActualizada = await tx.solicitud.update({
      where: { id },
      data: {
        estado: "ENTREGADA",
        fechaEntrega,
        contratoId: contrato.id,
      },
    });

    await tx.businessEvent.create({
      data: {
        operationId: OPERATIONS.solicitud.deliver,
        entityType: "Solicitud",
        entityId: id,
        userId: userId ?? null,
        payload: { motoId: solicitud.motoAsignadaId, duracionMeses, esLeaseToOwn },
      },
    });

    return {
      solicitud: solicitudActualizada,
      contrato,
      cuotasGeneradas: fechasCuotas.length,
      mantenimientosGenerados: fechasMantenimiento.length,
    };
  });

  return NextResponse.json({ data: result });
}
