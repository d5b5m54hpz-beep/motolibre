import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCondicion } from "@/lib/catalog-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const moto = await prisma.moto.findFirst({
    where: { id, estado: "DISPONIBLE" },
    select: {
      id: true,
      marca: true,
      modelo: true,
      anio: true,
      color: true,
      cilindrada: true,
      tipo: true,
      km: true,
      imagenUrl: true,
      fotos: true,
      destacada: true,
      potencia: true,
      tipoMotor: true,
      arranque: true,
      frenos: true,
      capacidadTanque: true,
      peso: true,
      // NO: patente, numMotor, numChasis, precioCompra, etc.
    },
  });

  if (!moto) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
  }

  const modeloMoto = `${moto.marca} ${moto.modelo}`;
  const condicion = getCondicion(moto.km, moto.anio);

  // All available plans for this model
  const precios = await prisma.precioModeloAlquiler.findMany({
    where: { modeloMoto, condicion, activo: true },
    include: { plan: true },
    orderBy: { plan: { orden: "asc" } },
  });

  const planes = precios
    .filter((p) => p.plan.activo)
    .map((p) => ({
      planId: p.plan.id,
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

  // Related motos (same tipo, excluding self)
  const related = await prisma.moto.findMany({
    where: {
      estado: "DISPONIBLE",
      id: { not: id },
      tipo: moto.tipo,
    },
    select: {
      id: true,
      marca: true,
      modelo: true,
      anio: true,
      cilindrada: true,
      tipo: true,
      km: true,
      imagenUrl: true,
      fotos: true,
    },
    take: 4,
  });

  // Enrich related with prices
  const relatedWithPrices = await Promise.all(
    related.map(async (r) => {
      const rModeloMoto = `${r.marca} ${r.modelo}`;
      const rCondicion = getCondicion(r.km, r.anio);
      const lowest = await prisma.precioModeloAlquiler.findFirst({
        where: { modeloMoto: rModeloMoto, condicion: rCondicion, activo: true },
        orderBy: { precioFinal: "asc" },
        select: { precioFinal: true, plan: { select: { frecuencia: true } } },
      });
      return {
        id: r.id,
        marca: r.marca,
        modelo: r.modelo,
        anio: r.anio,
        cilindrada: r.cilindrada,
        tipo: r.tipo,
        km: r.km,
        foto: r.fotos[0] ?? r.imagenUrl ?? null,
        precioDesde: lowest ? Number(lowest.precioFinal) : null,
        frecuenciaPrecio: lowest?.plan.frecuencia === "SEMANAL" ? "semanal" : "mensual",
      };
    })
  );

  // Build photos array
  const allFotos = [...moto.fotos];
  if (moto.imagenUrl && !allFotos.includes(moto.imagenUrl)) {
    allFotos.unshift(moto.imagenUrl);
  }

  return NextResponse.json({
    data: {
      id: moto.id,
      marca: moto.marca,
      modelo: moto.modelo,
      anio: moto.anio,
      color: moto.color,
      cilindrada: moto.cilindrada,
      tipo: moto.tipo,
      km: moto.km,
      fotos: allFotos,
      destacada: moto.destacada,
      condicion,
      planes,
      specs: {
        cilindrada: moto.cilindrada ? `${moto.cilindrada} cc` : null,
        potencia: moto.potencia,
        tipoMotor: moto.tipoMotor,
        arranque: moto.arranque,
        frenos: moto.frenos,
        capacidadTanque: moto.capacidadTanque ? `${Number(moto.capacidadTanque)} L` : null,
        peso: moto.peso ? `${Number(moto.peso)} kg` : null,
        km: `${moto.km.toLocaleString("es-AR")} km`,
      },
      relacionadas: relatedWithPrices,
    },
  });
}
