import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.hr.payroll.liquidate,
    "canView",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const { id } = await params;
  const recibo = await prisma.reciboSueldo.findUnique({
    where: { id },
    include: {
      empleado: {
        select: {
          nombre: true,
          apellido: true,
          legajo: true,
          departamento: true,
          cargo: true,
          cbu: true,
          banco: true,
        },
      },
    },
  });

  if (!recibo) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: recibo });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.hr.payroll.approve,
    "canApprove",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { estado } = body as { estado: "PAGADO" | "ANULADO" };

  if (!["PAGADO", "ANULADO"].includes(estado)) {
    return NextResponse.json(
      { error: "Estado debe ser PAGADO o ANULADO" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = { estado };
  if (estado === "PAGADO") data.fechaPago = new Date();

  const recibo = await prisma.reciboSueldo.update({
    where: { id },
    data,
  });

  return NextResponse.json({ data: recibo });
}
