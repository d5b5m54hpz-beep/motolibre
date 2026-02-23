import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCondicion } from "@/lib/catalog-utils";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const marca = sp.get("marca");
  const tipo = sp.get("tipo");
  const orden = sp.get("orden") ?? "marca";
  const featured = sp.get("featured") === "true";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "12")));
  const precioMin = sp.get("precioMin") ? Number(sp.get("precioMin")) : null;
  const precioMax = sp.get("precioMax") ? Number(sp.get("precioMax")) : null;

  // Only DISPONIBLE motos
  const where: Prisma.MotoWhereInput = { estado: "DISPONIBLE" };
  if (marca) where.marca = { equals: marca, mode: "insensitive" };
  if (tipo) where.tipo = tipo as Prisma.EnumTipoMotoFilter;
  if (featured) where.destacada = true;

  // Sort (price sorting is post-query)
  let orderBy: Prisma.MotoOrderByWithRelationInput[] = [{ marca: "asc" }, { modelo: "asc" }];
  if (orden === "km") orderBy = [{ km: "asc" }];
  if (orden === "newest") orderBy = [{ anio: "desc" }, { createdAt: "desc" }];

  const [motos, total] = await Promise.all([
    prisma.moto.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
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
      },
    }),
    prisma.moto.count({ where }),
  ]);

  // Enrich with lowest price from PrecioModeloAlquiler
  const enriched = await Promise.all(
    motos.map(async (moto) => {
      const modeloMoto = `${moto.marca} ${moto.modelo}`;
      const condicion = getCondicion(moto.km, moto.anio);

      const lowestPrice = await prisma.precioModeloAlquiler.findFirst({
        where: { modeloMoto, condicion, activo: true },
        orderBy: { precioFinal: "asc" },
        select: {
          precioFinal: true,
          moneda: true,
          plan: { select: { nombre: true, frecuencia: true } },
        },
      });

      if (!lowestPrice) return null; // Exclude motos without pricing

      return {
        id: moto.id,
        marca: moto.marca,
        modelo: moto.modelo,
        anio: moto.anio,
        cilindrada: moto.cilindrada,
        tipo: moto.tipo,
        km: moto.km,
        foto: moto.fotos[0] ?? moto.imagenUrl ?? null,
        destacada: moto.destacada,
        precioDesde: Number(lowestPrice.precioFinal),
        moneda: lowestPrice.moneda,
        frecuenciaPrecio: lowestPrice.plan.frecuencia === "SEMANAL" ? "semanal" : "mensual",
      };
    })
  );

  // Filter out motos without prices
  let result = enriched.filter((m): m is NonNullable<typeof m> => m !== null);

  // Post-filter by price range
  if (precioMin !== null) result = result.filter((m) => m.precioDesde >= precioMin);
  if (precioMax !== null) result = result.filter((m) => m.precioDesde <= precioMax);

  // Post-sort by price
  if (orden === "precio_asc") result.sort((a, b) => a.precioDesde - b.precioDesde);
  if (orden === "precio_desc") result.sort((a, b) => b.precioDesde - a.precioDesde);

  // Available filter values
  const [marcas, tipos] = await Promise.all([
    prisma.moto.findMany({ where: { estado: "DISPONIBLE" }, distinct: ["marca"], select: { marca: true } }),
    prisma.moto.findMany({ where: { estado: "DISPONIBLE" }, distinct: ["tipo"], select: { tipo: true } }),
  ]);

  return NextResponse.json({
    data: result,
    total: result.length,
    page,
    totalPages: Math.ceil(result.length / limit) || 1,
    filtros: {
      marcas: marcas.map((m) => m.marca).sort(),
      tipos: tipos.map((t) => t.tipo).sort(),
    },
  });
}
