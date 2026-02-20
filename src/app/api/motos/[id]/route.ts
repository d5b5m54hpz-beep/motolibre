import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { motoUpdateSchema } from "@/lib/validations/moto";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const moto = await prisma.moto.findUnique({
    where: { id },
    include: {
      documentos: { orderBy: { createdAt: "desc" } },
      historialEstados: { orderBy: { createdAt: "desc" }, take: 20 },
      lecturasKm: { orderBy: { createdAt: "desc" }, take: 10 },
      baja: true,
      amortizaciones: { orderBy: { periodo: "desc" }, take: 12 },
    },
  });

  if (!moto) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: moto });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.update,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = motoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const existing = await prisma.moto.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
  }

  if (data.patente && data.patente !== existing.patente) {
    const exists = await prisma.moto.findUnique({ where: { patente: data.patente } });
    if (exists) return NextResponse.json({ error: "Patente ya registrada" }, { status: 409 });
  }

  const moto = await withEvent(
    OPERATIONS.fleet.moto.update,
    "Moto",
    () =>
      prisma.moto.update({
        where: { id },
        data: {
          ...data,
          precioCompra: data.precioCompra !== undefined ? data.precioCompra ?? undefined : undefined,
          fechaCompra: data.fechaCompra ? new Date(data.fechaCompra) : undefined,
          cotizacionCompra: data.cotizacionCompra !== undefined ? data.cotizacionCompra ?? undefined : undefined,
          precioAlquilerMensual: data.precioAlquilerMensual !== undefined ? data.precioAlquilerMensual ?? undefined : undefined,
          valorResidual: data.valorResidual !== undefined ? data.valorResidual : undefined,
          fechaAltaContable: data.fechaAltaContable ? new Date(data.fechaAltaContable) : undefined,
        },
      }),
    userId
  );

  return NextResponse.json({ data: moto });
}
