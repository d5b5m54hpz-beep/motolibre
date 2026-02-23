import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { wizardIniciarSchema } from "@/lib/validations/wizard-alquiler";
import { getCondicion } from "@/lib/catalog-utils";
import { generarPreview } from "@/lib/contrato-utils";
import type { FrecuenciaPago } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = wizardIniciarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { motoId, planCodigo } = parsed.data;

  // Fetch moto
  const moto = await prisma.moto.findFirst({
    where: { id: motoId, estado: "DISPONIBLE" },
    select: {
      id: true,
      marca: true,
      modelo: true,
      anio: true,
      cilindrada: true,
      km: true,
      color: true,
      tipo: true,
      imagenUrl: true,
      fotos: true,
    },
  });

  if (!moto) {
    return NextResponse.json({ error: "Moto no disponible" }, { status: 404 });
  }

  const modeloMoto = `${moto.marca} ${moto.modelo}`;
  const condicion = getCondicion(moto.km, moto.anio);
  const foto = moto.fotos[0] ?? moto.imagenUrl ?? null;

  // Fetch ALL active plans with prices for this model
  const precios = await prisma.precioModeloAlquiler.findMany({
    where: { modeloMoto, condicion, activo: true },
    include: { plan: true },
    orderBy: { plan: { orden: "asc" } },
  });

  const planes = precios
    .filter((p) => p.plan.activo)
    .map((p) => ({
      id: p.plan.id,
      nombre: p.plan.nombre,
      codigo: p.plan.codigo,
      frecuencia: p.plan.frecuencia,
      duracionMeses: p.plan.duracionMeses,
      descuento: Number(p.plan.descuentoPorcentaje ?? 0),
      incluyeTransferencia: p.plan.incluyeTransferencia,
      precioBase: Number(p.precioBase),
      precioFinal: Number(p.precioFinal),
      moneda: p.moneda,
    }));

  if (planes.length === 0) {
    return NextResponse.json({ error: "No hay planes disponibles para esta moto" }, { status: 422 });
  }

  // Find selected plan or default to first
  const selectedPlan = planes.find((p) => p.codigo === planCodigo) ?? planes[0]!;

  // Generate preview using contrato-utils
  const duracionMeses = selectedPlan.duracionMeses ?? 12;
  const frecuencia = selectedPlan.frecuencia as FrecuenciaPago;
  const precioMensual =
    frecuencia === "SEMANAL"
      ? Math.round(selectedPlan.precioFinal * 4.33)
      : selectedPlan.precioFinal;

  const preview = generarPreview(
    precioMensual,
    frecuencia,
    duracionMeses,
    0,
    selectedPlan.incluyeTransferencia
  );

  return NextResponse.json({
    data: {
      moto: {
        id: moto.id,
        marca: moto.marca,
        modelo: moto.modelo,
        anio: moto.anio,
        cilindrada: moto.cilindrada,
        km: moto.km,
        color: moto.color,
        tipo: moto.tipo,
        foto,
        condicion,
      },
      planes,
      selectedPlan,
      preview: {
        ...preview,
        montoPrimerPago: selectedPlan.precioFinal,
      },
    },
  });
}
