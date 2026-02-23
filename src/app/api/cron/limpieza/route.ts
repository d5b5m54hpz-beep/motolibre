import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Delete EventoSistema older than 90 days
    const hace90Dias = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const eventosResult = await prisma.eventoSistema.deleteMany({
      where: { createdAt: { lt: hace90Dias } },
    });

    // 2. Delete read Alertas older than 60 days
    const hace60Dias = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const alertasResult = await prisma.alerta.deleteMany({
      where: {
        leida: true,
        createdAt: { lt: hace60Dias },
      },
    });

    // 3. Delete expired Sessions
    const sesionesResult = await prisma.session.deleteMany({
      where: { expires: { lt: now } },
    });

    // 4. Release stale reservations: solicitudes APROBADA/ASIGNADA
    //    with moto RESERVADA and not updated in 24h
    const hace24Horas = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const solicitudesEstancadas = await prisma.solicitud.findMany({
      where: {
        estado: { in: ["APROBADA", "ASIGNADA"] },
        motoAsignadaId: { not: null },
        updatedAt: { lt: hace24Horas },
        moto: {
          estado: "RESERVADA",
        },
      },
      select: {
        id: true,
        motoAsignadaId: true,
      },
    });

    let reservasLiberadas = 0;

    for (const sol of solicitudesEstancadas) {
      await prisma.$transaction([
        prisma.moto.update({
          where: { id: sol.motoAsignadaId! },
          data: { estado: "DISPONIBLE" },
        }),
        prisma.solicitud.update({
          where: { id: sol.id },
          data: { motoAsignadaId: null },
        }),
      ]);
      reservasLiberadas++;
    }

    return NextResponse.json({
      data: {
        eventosLimpiados: eventosResult.count,
        alertasLimpiadas: alertasResult.count,
        sesionesLimpiadas: sesionesResult.count,
        reservasLiberadas,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error en cron job limpieza";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
