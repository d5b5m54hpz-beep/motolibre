import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

/**
 * GET /api/portal-taller/asignaciones
 * Returns OT assignments for the logged-in taller.
 */
export async function GET(req: NextRequest) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "TALLER_EXTERNO") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const taller = await prisma.taller.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!taller) {
    return NextResponse.json(
      { error: "Taller no encontrado" },
      { status: 404 }
    );
  }

  const estado = req.nextUrl.searchParams.get("estado"); // PENDIENTE, ACEPTADA, etc.

  const where: Record<string, unknown> = { tallerId: taller.id };
  if (estado) where.estado = estado;

  const asignaciones = await prisma.asignacionOT.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Fetch OT details for each assignment
  const otIds = asignaciones.map((a) => a.ordenTrabajoId);
  const ordenes = await prisma.ordenTrabajo.findMany({
    where: { id: { in: otIds } },
    select: {
      id: true,
      numero: true,
      tipo: true,
      prioridad: true,
      estado: true,
      descripcion: true,
      motoId: true,
      tipoService: true,
      fechaProgramada: true,
      costoTotal: true,
      tareas: {
        select: { categoria: true, descripcion: true },
        orderBy: { orden: "asc" },
      },
    },
  });

  // Fetch moto info
  const motoIds = [...new Set(ordenes.map((o) => o.motoId))];
  const motos = await prisma.moto.findMany({
    where: { id: { in: motoIds } },
    select: { id: true, marca: true, modelo: true, patente: true },
  });
  const motoMap = Object.fromEntries(motos.map((m) => [m.id, m]));
  const otMap = Object.fromEntries(ordenes.map((o) => [o.id, o]));

  const data = asignaciones.map((a) => {
    const ot = otMap[a.ordenTrabajoId];
    const moto = ot ? motoMap[ot.motoId] : null;
    return {
      ...a,
      ordenTrabajo: ot
        ? {
            ...ot,
            moto: moto
              ? { marca: moto.marca, modelo: moto.modelo, patente: moto.patente }
              : null,
          }
        : null,
    };
  });

  return NextResponse.json({ data });
}
