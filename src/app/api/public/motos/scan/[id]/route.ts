import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const moto = await prisma.moto.findUnique({
    where: { id },
    select: {
      id: true, marca: true, modelo: true, anio: true, color: true,
      cilindrada: true, tipo: true, km: true, patente: true, estado: true,
      imagenUrl: true, fotos: true,
    },
  });

  if (!moto) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
  }

  const estadoPublico =
    moto.estado === "DISPONIBLE" ? "Disponible" :
    moto.estado === "ALQUILADA" ? "Alquilada" :
    moto.estado === "EN_SERVICE" ? "En servicio" :
    "No disponible";

  return NextResponse.json({
    data: {
      id: moto.id,
      marca: moto.marca,
      modelo: moto.modelo,
      anio: moto.anio,
      color: moto.color,
      cilindrada: moto.cilindrada,
      tipo: moto.tipo,
      patente: moto.patente ?? "—",
      estado: estadoPublico,
      foto: moto.fotos[0] ?? moto.imagenUrl ?? null,
      catalogoUrl: moto.estado === "DISPONIBLE" ? `/catalogo/${moto.id}` : null,
      empresa: {
        nombre: "MotoLibre S.A.",
        cuit: "30-71617222-4",
        contacto: "soporte@motolibre.com.ar",
      },
    },
  });
}
