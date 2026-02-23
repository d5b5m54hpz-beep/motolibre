import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const repuesto = await prisma.repuesto.findUnique({
      where: { id },
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
        activo: true,
      },
    });

    if (!repuesto || !repuesto.activo) {
      return NextResponse.json(
        { error: "Repuesto no encontrado" },
        { status: 404 }
      );
    }

    const relacionados = await prisma.repuesto.findMany({
      where: {
        activo: true,
        stock: { gt: 0 },
        categoria: repuesto.categoria,
        id: { not: id },
      },
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
      take: 4,
      orderBy: { nombre: "asc" },
    });

    // Exclude activo from the response since it's internal
    const { activo: _, ...repuestoData } = repuesto;

    return NextResponse.json({
      repuesto: {
        ...repuestoData,
        precio: Number(repuesto.precioVenta ?? repuesto.precioCompra),
      },
      relacionados: relacionados.map((r) => ({
        ...r,
        precio: Number(r.precioVenta ?? r.precioCompra),
      })),
    });
  } catch (error: unknown) {
    console.error("Error fetching public repuesto:", error);
    return NextResponse.json(
      { error: "Error al obtener repuesto" },
      { status: 500 }
    );
  }
}
