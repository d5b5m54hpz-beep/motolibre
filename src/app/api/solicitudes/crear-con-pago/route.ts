import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { solicitudCreateSchema } from "@/lib/validations/solicitud";
import { crearPreferenciaPrimerMes } from "@/lib/mp-service";
import { getTarifaVigente, planToMeses } from "@/lib/pricing-utils";
import { OPERATIONS } from "@/lib/events";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = solicitudCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const solicitudActiva = await prisma.solicitud.findFirst({
    where: {
      clienteId: data.clienteId,
      estado: {
        in: ["PAGO_PENDIENTE", "PAGADA", "EN_EVALUACION", "APROBADA", "EN_ESPERA", "ASIGNADA"],
      },
    },
  });
  if (solicitudActiva) {
    return NextResponse.json({ error: "Ya tenés una solicitud activa" }, { status: 422 });
  }

  const tarifaSemanal = await getTarifaVigente(
    data.marcaDeseada,
    data.modeloDeseado,
    data.condicionDeseada,
    data.plan,
    "SEMANAL"
  );
  const tarifaMensual = await getTarifaVigente(
    data.marcaDeseada,
    data.modeloDeseado,
    data.condicionDeseada,
    data.plan,
    "MENSUAL"
  );

  if (!tarifaSemanal) {
    return NextResponse.json(
      { error: "No hay tarifa semanal vigente para esta combinación" },
      { status: 422 }
    );
  }

  // El primer mes se calcula como 4.33 × precio semanal
  const montoPrimerMes = Math.round(Number(tarifaSemanal.precio) * 4.33);

  const solicitud = await prisma.solicitud.create({
    data: {
      clienteId: data.clienteId,
      marcaDeseada: data.marcaDeseada,
      modeloDeseado: data.modeloDeseado,
      condicionDeseada: data.condicionDeseada,
      plan: data.plan,
      precioSemanal: tarifaSemanal.precio,
      precioMensual: tarifaMensual?.precio ?? null,
      montoPrimerMes,
      estado: "PAGO_PENDIENTE",
    },
  });

  try {
    const mp = await crearPreferenciaPrimerMes({
      solicitudId: solicitud.id,
      clienteNombre: cliente.nombre,
      clienteApellido: cliente.apellido,
      clienteEmail: cliente.email,
      motoModelo: `${data.marcaDeseada} ${data.modeloDeseado}`,
      plan: data.plan,
      monto: montoPrimerMes,
    });

    await prisma.solicitud.update({
      where: { id: solicitud.id },
      data: { mpPreferenceId: mp.preferenceId },
    });

    await prisma.businessEvent.create({
      data: {
        operationId: OPERATIONS.solicitud.create,
        entityType: "Solicitud",
        entityId: solicitud.id,
        userId: "system",
        payload: {
          plan: data.plan,
          montoPrimerMes,
          mpPreferenceId: mp.preferenceId,
        },
      },
    });

    return NextResponse.json(
      {
        data: {
          solicitud,
          pago: {
            monto: montoPrimerMes,
            linkPago: mp.initPoint,
            linkPagoSandbox: mp.sandboxInitPoint,
            preferenceId: mp.preferenceId,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await prisma.solicitud.delete({ where: { id: solicitud.id } });
    console.error("[Solicitud] Error creando preferencia MP:", error);
    return NextResponse.json({ error: "Error al generar link de pago" }, { status: 500 });
  }
}
