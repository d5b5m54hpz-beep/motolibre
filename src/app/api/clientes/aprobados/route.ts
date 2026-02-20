import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.commercial.contract.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL"]
  );
  if (error) return error;

  const clientes = await prisma.cliente.findMany({
    where: {
      estado: "APROBADO",
      contratos: { none: { estado: "ACTIVO" } },
    },
    select: { id: true, nombre: true, apellido: true, dni: true, email: true },
    orderBy: { apellido: "asc" },
  });

  return NextResponse.json({ data: clientes });
}
