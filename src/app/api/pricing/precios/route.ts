import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { precioModeloSchema } from "@/lib/validations/pricing";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId");
    const modeloMoto = searchParams.get("modeloMoto");
    const condicion = searchParams.get("condicion");

    const precios = await prisma.precioModeloAlquiler.findMany({
      where: {
        ...(planId && { planId }),
        ...(modeloMoto && { modeloMoto }),
        ...(condicion && { condicion }),
        activo: true,
      },
      include: { plan: { select: { nombre: true, frecuencia: true, descuentoPorcentaje: true } } },
      orderBy: [{ modeloMoto: "asc" }, { condicion: "asc" }],
    });
    return NextResponse.json(precios);
  } catch {
    return NextResponse.json({ error: "Error al obtener precios" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = precioModeloSchema.parse(body);

    const plan = await prisma.planAlquiler.findUnique({ where: { id: data.planId } });
    if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

    const descuento = Number(plan.descuentoPorcentaje ?? 0);
    const precioFinal = Math.round(data.precioBase * (1 - descuento / 100) * 100) / 100;

    // Desactivar precio anterior si existe
    const anterior = await prisma.precioModeloAlquiler.findFirst({
      where: { planId: data.planId, modeloMoto: data.modeloMoto, condicion: data.condicion, activo: true },
    });

    if (anterior) {
      await prisma.precioModeloAlquiler.update({ where: { id: anterior.id }, data: { activo: false } });
      await prisma.historialPrecioAlquiler.create({
        data: {
          precioModeloId: anterior.id,
          planId: data.planId,
          modeloMoto: data.modeloMoto,
          precioAnterior: anterior.precioFinal,
          precioNuevo: precioFinal,
          motivo: "Actualización de precio",
        },
      });
    }

    const precio = await prisma.precioModeloAlquiler.create({
      data: { ...data, precioFinal },
      include: { plan: { select: { nombre: true, frecuencia: true } } },
    });

    return NextResponse.json(precio, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear precio" }, { status: 500 });
  }
}
