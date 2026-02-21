import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, eventBus } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { despachoCreateSchema } from "@/lib/validations/embarque";
import { calcularCIF } from "@/lib/importacion-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.supply.shipment.changeState,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const embarque = await prisma.embarqueImportacion.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!embarque) {
    return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
  }
  if (embarque.estado !== "EN_ADUANA" && embarque.estado !== "DESPACHADO_PARCIAL") {
    return NextResponse.json(
      { error: "El embarque debe estar EN_ADUANA o DESPACHADO_PARCIAL para registrar despacho" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = despachoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const totalFOB = Number(embarque.totalFOB);
  const totalCIF = calcularCIF(totalFOB, parsed.data.costoFlete, parsed.data.costoSeguro);
  const baseImponibleARS = totalCIF * parsed.data.tipoCambio;

  const totalDespacho =
    parsed.data.derechosImportacion +
    parsed.data.tasaEstadistica +
    parsed.data.ivaImportacion +
    parsed.data.ivaAdicional +
    parsed.data.ingresosBrutos +
    parsed.data.gastosVarios;

  // Crear despacho
  const despacho = await prisma.despachoAduanero.create({
    data: {
      embarqueId: id,
      numeroDespacho: parsed.data.numeroDespacho,
      fechaDespacho: new Date(parsed.data.fechaDespacho),
      despachante: parsed.data.despachante,
      baseImponible: baseImponibleARS,
      derechosImportacion: parsed.data.derechosImportacion,
      tasaEstadistica: parsed.data.tasaEstadistica,
      ivaImportacion: parsed.data.ivaImportacion,
      ivaAdicional: parsed.data.ivaAdicional,
      ingresosBrutos: parsed.data.ingresosBrutos,
      gastosVarios: parsed.data.gastosVarios,
      totalDespacho,
      observaciones: parsed.data.observaciones,
    },
  });

  // Actualizar embarque con costos
  await prisma.embarqueImportacion.update({
    where: { id },
    data: {
      estado: "DESPACHADO",
      tipoCambio: parsed.data.tipoCambio,
      costoFlete: parsed.data.costoFlete,
      costoSeguro: parsed.data.costoSeguro,
      totalCIF,
      derechosImportacion: parsed.data.derechosImportacion,
      tasaEstadistica: parsed.data.tasaEstadistica,
      ivaImportacion: parsed.data.ivaImportacion,
      ivaAdicional: parsed.data.ivaAdicional,
      ingresosBrutos: parsed.data.ingresosBrutos,
      gastosDespacho: parsed.data.gastosVarios,
      fechaDespacho: new Date(parsed.data.fechaDespacho),
    },
  });

  // Emit dispatch event → handler contable (Merc.Tránsito + IVA CF | Caja)
  await eventBus.emit(
    OPERATIONS.supply.shipment.create, // pattern for dispatch handler
    "EmbarqueImportacion",
    id,
    {
      despachoId: despacho.id,
      totalDespacho,
      derechosImportacion: parsed.data.derechosImportacion,
      tasaEstadistica: parsed.data.tasaEstadistica,
      ivaImportacion: parsed.data.ivaImportacion,
      ivaAdicional: parsed.data.ivaAdicional,
      ingresosBrutos: parsed.data.ingresosBrutos,
      gastosVarios: parsed.data.gastosVarios,
      baseImponibleARS,
    },
    userId
  );

  return NextResponse.json(despacho, { status: 201 });
}
