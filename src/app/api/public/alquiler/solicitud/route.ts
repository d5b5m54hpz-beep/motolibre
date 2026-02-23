import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { wizardDatosSchema } from "@/lib/validations/wizard-alquiler";
import { getCondicion } from "@/lib/catalog-utils";
import { OPERATIONS } from "@/lib/events";
import type { PlanDuracion } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = wizardDatosSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { motoId, planCodigo, nombre, apellido, email, telefono, dni, usoMoto } = parsed.data;

  // Recheck moto availability
  const moto = await prisma.moto.findFirst({
    where: { id: motoId, estado: "DISPONIBLE" },
    select: { id: true, marca: true, modelo: true, anio: true, km: true },
  });
  if (!moto) {
    return NextResponse.json({ error: "Esta moto ya no está disponible" }, { status: 422 });
  }

  // Fetch plan + price
  const plan = await prisma.planAlquiler.findFirst({
    where: { codigo: planCodigo, activo: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  const modeloMoto = `${moto.marca} ${moto.modelo}`;
  const condicion = getCondicion(moto.km, moto.anio);

  const precio = await prisma.precioModeloAlquiler.findFirst({
    where: { planId: plan.id, modeloMoto, condicion, activo: true },
  });
  if (!precio) {
    return NextResponse.json({ error: "No hay precio para esta combinación" }, { status: 422 });
  }

  // Upsert cliente by DNI
  const cliente = await prisma.cliente.upsert({
    where: { dni },
    create: {
      nombre,
      apellido,
      email: email.toLowerCase(),
      telefono,
      dni,
      plataformas: usoMoto ?? null,
      estado: "PENDIENTE",
      userId: session.user.id,
    },
    update: {
      nombre,
      apellido,
      telefono,
      plataformas: usoMoto ?? undefined,
      userId: session.user.id,
    },
  });

  // Check no active solicitud
  const solicitudActiva = await prisma.solicitud.findFirst({
    where: {
      clienteId: cliente.id,
      estado: { in: ["PAGO_PENDIENTE", "PAGADA", "EN_EVALUACION", "APROBADA", "EN_ESPERA", "ASIGNADA"] },
    },
  });
  if (solicitudActiva) {
    return NextResponse.json({ error: "Ya tenés una solicitud activa" }, { status: 422 });
  }

  // Map plan to legacy PlanDuracion
  const planDuracion: PlanDuracion = plan.duracionMeses === 24 ? "MESES_24" : "MESES_12";

  // Calculate prices
  const precioFinal = Number(precio.precioFinal);
  let precioSemanal: number;
  let precioMensual: number;
  let montoPrimerMes: number;

  if (plan.frecuencia === "SEMANAL") {
    precioSemanal = precioFinal;
    precioMensual = Math.round(precioFinal * 4.33);
    montoPrimerMes = Math.round(precioFinal * 4.33);
  } else {
    precioMensual = precioFinal;
    precioSemanal = Math.round(precioFinal / 4.33);
    montoPrimerMes = precioFinal;
  }

  const solicitud = await prisma.solicitud.create({
    data: {
      clienteId: cliente.id,
      marcaDeseada: moto.marca,
      modeloDeseado: moto.modelo,
      condicionDeseada: condicion as "NUEVA" | "USADA",
      plan: planDuracion,
      planAlquilerId: plan.id,
      precioSemanal,
      precioMensual,
      montoPrimerMes,
      estado: "PAGO_PENDIENTE",
    },
  });

  await prisma.businessEvent.create({
    data: {
      operationId: OPERATIONS.solicitud.create,
      entityType: "Solicitud",
      entityId: solicitud.id,
      userId: session.user.id,
      payload: { via: "wizard", planCodigo, motoId, montoPrimerMes },
    },
  });

  return NextResponse.json({
    data: {
      solicitudId: solicitud.id,
      clienteId: cliente.id,
      motoId: moto.id,
      montoPrimerMes,
    },
  }, { status: 201 });
}
