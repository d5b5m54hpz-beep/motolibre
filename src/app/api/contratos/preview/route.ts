import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { contratoPreviewSchema } from "@/lib/validations/contrato";
import { generarPreview } from "@/lib/contrato-utils";

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.commercial.contract.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = contratoPreviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const moto = await prisma.moto.findUnique({ where: { id: parsed.data.motoId } });
  if (!moto) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
  }
  if (!moto.precioAlquilerMensual) {
    return NextResponse.json({ error: "Moto sin precio de alquiler definido" }, { status: 422 });
  }

  const preview = generarPreview(
    Number(moto.precioAlquilerMensual),
    parsed.data.frecuenciaPago,
    parsed.data.duracionMeses,
    parsed.data.deposito,
    parsed.data.tieneOpcionCompra,
    moto.precioCompra ? Number(moto.precioCompra) : undefined
  );

  return NextResponse.json({ data: preview });
}
