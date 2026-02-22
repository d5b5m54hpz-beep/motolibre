import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reglaMarkupBulkSchema } from "@/lib/validations/pricing-repuestos";
import type { CategoriaRepuesto } from "@prisma/client";

export async function GET() {
  try {
    const reglas = await prisma.reglaMarkup.findMany({ orderBy: { categoria: "asc" } });
    return NextResponse.json(reglas);
  } catch {
    return NextResponse.json({ error: "Error al obtener markup" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Bulk upsert
  try {
    const body = await req.json();
    const items = reglaMarkupBulkSchema.parse(body);
    const result = await Promise.all(
      items.map((item) =>
        prisma.reglaMarkup.upsert({
          where: { categoria: item.categoria as CategoriaRepuesto },
          update: { porcentaje: item.porcentaje, descripcion: item.descripcion },
          create: {
            categoria: item.categoria as CategoriaRepuesto,
            porcentaje: item.porcentaje,
            descripcion: item.descripcion,
          },
        })
      )
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error al actualizar markup" }, { status: 500 });
  }
}
