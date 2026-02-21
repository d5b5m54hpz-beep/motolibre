import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.shipment.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const embarque = await prisma.embarqueImportacion.findUnique({
    where: { id },
    select: { id: true, proveedorId: true },
  });

  if (!embarque) {
    return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
  }

  // 30 day expiry
  const expiraAt = new Date();
  expiraAt.setDate(expiraAt.getDate() + 30);

  const portalToken = await prisma.portalProveedorToken.create({
    data: {
      embarqueId: id,
      proveedorId: embarque.proveedorId,
      expiraAt,
    },
  });

  const url = `/supplier/${portalToken.token}`;

  return NextResponse.json({ url, token: portalToken.token, expiraAt });
}
