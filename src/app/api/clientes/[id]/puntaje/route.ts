import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { puntajeSchema } from "@/lib/validations/cliente";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.client.update,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = puntajeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const puntaje = await prisma.puntajeRider.create({
    data: {
      clienteId: id,
      categoria: parsed.data.categoria,
      valor: parsed.data.valor,
      motivo: parsed.data.motivo,
      userId,
    },
  });

  // Recalcular score promedio
  const puntajes = await prisma.puntajeRider.findMany({ where: { clienteId: id } });
  const avgScore = Math.round(
    puntajes.reduce((sum, p) => sum + p.valor, 0) / puntajes.length
  );
  await prisma.cliente.update({ where: { id }, data: { score: avgScore } });

  return NextResponse.json({ data: puntaje }, { status: 201 });
}
