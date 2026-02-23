import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import type { EstadoOrdenVenta } from "@prisma/client";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PAGADA: ["EN_PREPARACION"],
  EN_PREPARACION: ["LISTA_RETIRO", "ENVIADA"],
  LISTA_RETIRO: ["ENTREGADA"],
  ENVIADA: ["ENTREGADA"],
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.sale.confirm,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const orden = await prisma.ordenVentaRepuesto.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          repuesto: {
            select: { id: true, nombre: true, stock: true },
          },
        },
      },
    },
  });

  if (!orden) {
    return NextResponse.json(
      { error: "Orden no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ orden });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.sale.confirm,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { estado } = body;

  if (!estado || typeof estado !== "string") {
    return NextResponse.json(
      { error: "Se requiere el campo 'estado'" },
      { status: 400 }
    );
  }

  const orden = await prisma.ordenVentaRepuesto.findUnique({
    where: { id },
  });

  if (!orden) {
    return NextResponse.json(
      { error: "Orden no encontrada" },
      { status: 404 }
    );
  }

  const allowed = VALID_TRANSITIONS[orden.estado];
  if (!allowed || !allowed.includes(estado)) {
    return NextResponse.json(
      {
        error: `Transición inválida: ${orden.estado} → ${estado}. Transiciones permitidas: ${(allowed ?? []).join(", ") || "ninguna"}`,
      },
      { status: 400 }
    );
  }

  const updated = await prisma.ordenVentaRepuesto.update({
    where: { id },
    data: { estado: estado as EstadoOrdenVenta },
  });

  return NextResponse.json({ orden: updated });
}
