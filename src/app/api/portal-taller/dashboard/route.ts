import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

/**
 * GET /api/portal-taller/dashboard
 * Returns taller info + stats for the logged-in taller user.
 */
export async function GET() {
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
    include: {
      solicitud: {
        include: { convenio: true },
      },
    },
  });

  if (!taller) {
    return NextResponse.json(
      { error: "Taller no encontrado" },
      { status: 404 }
    );
  }

  // Stats
  const [pendientes, aceptadas, completadasMes] = await Promise.all([
    prisma.asignacionOT.count({
      where: { tallerId: taller.id, estado: "PENDIENTE" },
    }),
    prisma.asignacionOT.count({
      where: { tallerId: taller.id, estado: "ACEPTADA" },
    }),
    prisma.asignacionOT.count({
      where: {
        tallerId: taller.id,
        estado: "ACEPTADA",
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      taller: {
        id: taller.id,
        nombre: taller.nombre,
        codigoRed: taller.codigoRed,
        tarifaHora: taller.tarifaHora,
        scoreCalidad: taller.scoreCalidad,
        otCompletadas: taller.otCompletadas,
        capacidadOTMes: taller.capacidadOTMes,
      },
      stats: {
        pendientes,
        aceptadas,
        completadasMes,
      },
    },
  });
}
