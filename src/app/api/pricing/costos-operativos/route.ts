import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { costoOperativoSchema } from "@/lib/validations/pricing";

export async function GET() {
  try {
    const costos = await prisma.costoOperativoConfig.findMany({
      orderBy: { concepto: "asc" },
    });
    const total = costos
      .filter((c) => c.activo)
      .reduce((sum, c) => sum + Number(c.montoMensual), 0);
    return NextResponse.json({ costos, total });
  } catch {
    return NextResponse.json({ error: "Error al obtener costos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = costoOperativoSchema.parse(body);
    const costo = await prisma.costoOperativoConfig.create({ data });
    return NextResponse.json(costo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear costo" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  // Bulk update: array de { id, montoMensual, descripcion, activo }
  try {
    const items: { id: string; montoMensual: number; descripcion?: string; activo?: boolean }[] =
      await req.json();

    await Promise.all(
      items.map((item) =>
        prisma.costoOperativoConfig.update({
          where: { id: item.id },
          data: {
            montoMensual: item.montoMensual,
            descripcion: item.descripcion,
            activo: item.activo,
          },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al actualizar costos" }, { status: 500 });
  }
}
