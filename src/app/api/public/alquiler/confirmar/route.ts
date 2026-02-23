import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { wizardConfirmarSchema } from "@/lib/validations/wizard-alquiler";
import { generarFechasCuotas } from "@/lib/contrato-utils";
import { crearPreferenciaCuota } from "@/lib/mp-service";
import { OPERATIONS } from "@/lib/events";
import type { FrecuenciaPago } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = wizardConfirmarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { solicitudId } = parsed.data;

  // Load solicitud with plan
  const solicitud = await prisma.solicitud.findUnique({
    where: { id: solicitudId },
    include: { cliente: true, planAlquiler: true },
  });

  if (!solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }
  if (solicitud.estado !== "PAGO_PENDIENTE") {
    return NextResponse.json({ error: "Esta solicitud ya fue procesada" }, { status: 422 });
  }

  const planAlquiler = solicitud.planAlquiler;
  if (!planAlquiler) {
    return NextResponse.json({ error: "Solicitud sin plan asociado" }, { status: 422 });
  }

  const frecuencia = planAlquiler.frecuencia as FrecuenciaPago;
  const duracionMeses = planAlquiler.duracionMeses ?? 12;
  const esLeaseToOwn = planAlquiler.incluyeTransferencia;
  const montoPeriodo = frecuencia === "SEMANAL"
    ? Number(solicitud.precioSemanal)
    : Number(solicitud.precioMensual ?? solicitud.montoPrimerMes);

  // Find the moto — use marcaDeseada + modeloDeseado to find DISPONIBLE
  const moto = await prisma.moto.findFirst({
    where: {
      marca: solicitud.marcaDeseada,
      modelo: solicitud.modeloDeseado,
      estado: "DISPONIBLE",
    },
    select: { id: true, marca: true, modelo: true },
  });

  if (!moto) {
    return NextResponse.json(
      { error: "Lo sentimos, esta moto fue alquilada por otro cliente. Podés ver otras motos disponibles en el catálogo." },
      { status: 409 }
    );
  }

  const fechaInicio = new Date();
  const fechaFin = new Date(fechaInicio);
  fechaFin.setMonth(fechaFin.getMonth() + duracionMeses);

  const fechasCuotas = generarFechasCuotas(fechaInicio, duracionMeses, frecuencia);

  let result: { contrato: { id: string }; firstCuotaId: string };

  try {
    result = await prisma.$transaction(async (tx) => {
      // Recheck moto is still DISPONIBLE inside transaction
      const motoCheck = await tx.moto.findUnique({ where: { id: moto.id } });
      if (!motoCheck || motoCheck.estado !== "DISPONIBLE") {
        throw new Error("MOTO_NO_DISPONIBLE");
      }

      // Update solicitud → APROBADA
      await tx.solicitud.update({
        where: { id: solicitudId },
        data: {
          estado: "APROBADA",
          motoAsignadaId: moto.id,
          fechaAsignacion: new Date(),
          fechaEvaluacion: new Date(),
          evaluadoPor: "self-service",
        },
      });

      // Reserve moto: DISPONIBLE → RESERVADA
      await tx.moto.update({
        where: { id: moto.id },
        data: { estado: "RESERVADA", estadoAnterior: "DISPONIBLE" },
      });
      await tx.historialEstadoMoto.create({
        data: {
          motoId: moto.id,
          estadoAnterior: "DISPONIBLE",
          estadoNuevo: "RESERVADA",
          motivo: `Reservada via wizard — solicitud ${solicitudId}`,
          userId: session.user.id,
        },
      });

      // Create contrato ACTIVO
      const contrato = await tx.contrato.create({
        data: {
          clienteId: solicitud.clienteId,
          motoId: moto.id,
          estado: "ACTIVO",
          fechaInicio,
          fechaFin,
          fechaActivacion: fechaInicio,
          frecuenciaPago: frecuencia,
          montoPeriodo,
          deposito: 0,
          depositoDevuelto: false,
          duracionMeses,
          tieneOpcionCompra: esLeaseToOwn,
          esLeaseToOwn,
          renovacionAuto: false,
          creadoPor: session.user.id,
        },
      });

      // Create ALL cuotas
      await tx.cuota.createMany({
        data: fechasCuotas.map((fecha, i) => ({
          contratoId: contrato.id,
          numero: i + 1,
          monto: montoPeriodo,
          fechaVencimiento: fecha,
        })),
      });

      // Get first cuota ID for MP preference
      const firstCuota = await tx.cuota.findFirst({
        where: { contratoId: contrato.id, numero: 1 },
        select: { id: true },
      });

      // Link solicitud → contrato
      await tx.solicitud.update({
        where: { id: solicitudId },
        data: { contratoId: contrato.id },
      });

      // Events
      await tx.businessEvent.create({
        data: {
          operationId: OPERATIONS.solicitud.approve,
          entityType: "Solicitud",
          entityId: solicitudId,
          userId: session.user.id,
          payload: { via: "wizard" },
        },
      });
      await tx.businessEvent.create({
        data: {
          operationId: OPERATIONS.commercial.contract.create,
          entityType: "Contrato",
          entityId: contrato.id,
          userId: session.user.id,
          payload: { motoId: moto.id, duracionMeses, esLeaseToOwn },
        },
      });

      return { contrato, firstCuotaId: firstCuota!.id };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MOTO_NO_DISPONIBLE") {
      return NextResponse.json(
        { error: "Lo sentimos, esta moto fue alquilada por otro cliente." },
        { status: 409 }
      );
    }
    console.error("[Wizard Confirmar] Error en transacción:", error);
    return NextResponse.json({ error: "Error al crear el contrato" }, { status: 500 });
  }

  // Create MP preference (outside transaction)
  try {
    const mp = await crearPreferenciaCuota({
      cuotaId: result.firstCuotaId,
      contratoId: result.contrato.id,
      numeroCuota: 1,
      clienteEmail: solicitud.cliente.email,
      motoModelo: `${moto.marca} ${moto.modelo}`,
      monto: montoPeriodo,
      backUrls: {
        success: `/alquiler/exito`,
        failure: `/alquiler/error`,
        pending: `/alquiler/pendiente`,
      },
    });

    return NextResponse.json({
      data: {
        contratoId: result.contrato.id,
        pagoUrl: mp.initPoint,
        sandboxUrl: mp.sandboxInitPoint,
        preferenceId: mp.preferenceId,
      },
    });
  } catch (error) {
    console.error("[Wizard Confirmar] Error creando preferencia MP:", error);
    return NextResponse.json({
      data: {
        contratoId: result.contrato.id,
        pagoUrl: null,
        error: "Error al generar link de pago. Podés reintentar desde Mi Cuenta.",
      },
    });
  }
}
