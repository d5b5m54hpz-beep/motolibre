import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CategoriaRepuesto } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const categoria = sp.get("categoria");
    const marca = sp.get("marca");
    const busqueda = sp.get("busqueda");
    const precioMin = sp.get("precioMin");
    const precioMax = sp.get("precioMax");
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(sp.get("limit") || "12")));

    const where: Record<string, unknown> = {
      activo: true,
      stock: { gt: 0 },
    };

    if (categoria) {
      where.categoria = categoria as CategoriaRepuesto;
    }

    if (marca) {
      where.marca = { contains: marca, mode: "insensitive" };
    }

    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: "insensitive" } },
        { codigo: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    if (precioMin || precioMax) {
      const minVal = precioMin ? parseFloat(precioMin) : undefined;
      const maxVal = precioMax ? parseFloat(precioMax) : undefined;

      const ventaCondition: Record<string, unknown> = {};
      const compraCondition: Record<string, unknown> = {};

      if (minVal !== undefined) {
        ventaCondition.gte = minVal;
        compraCondition.gte = minVal;
      }
      if (maxVal !== undefined) {
        ventaCondition.lte = maxVal;
        compraCondition.lte = maxVal;
      }

      where.AND = [
        {
          OR: [
            { precioVenta: { not: null, ...ventaCondition } },
            { precioVenta: null, precioCompra: compraCondition },
          ],
        },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.repuesto.findMany({
        where,
        select: {
          id: true,
          codigo: true,
          nombre: true,
          descripcion: true,
          categoria: true,
          marca: true,
          modeloCompatible: true,
          stock: true,
          precioVenta: true,
          precioCompra: true,
        },
        orderBy: { nombre: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.repuesto.count({ where }),
    ]);

    const repuestos = data.map((r) => ({
      ...r,
      precio: Number(r.precioVenta ?? r.precioCompra),
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ repuestos, total, page, totalPages });
  } catch (error: unknown) {
    console.error("Error fetching public repuestos:", error);
    return NextResponse.json(
      { error: "Error al obtener repuestos" },
      { status: 500 }
    );
  }
}
