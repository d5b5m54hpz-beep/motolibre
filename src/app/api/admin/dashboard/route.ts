import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.config.update,
    "canView",
    ["ADMIN", "OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    usersThisMonth,
    totalEvents,
    eventsThisMonth,
    recentEvents,
    usersByRole,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.businessEvent.count(),
    prisma.businessEvent.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.businessEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        operationId: true,
        entityType: true,
        entityId: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
  ]);

  let eventsByDay: Array<{ date: string; count: number }> = [];
  try {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const raw = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE("created_at") as date, COUNT(*) as count
      FROM "business_events"
      WHERE "created_at" >= ${thirtyDaysAgo}
      GROUP BY DATE("created_at")
      ORDER BY date ASC
    `;
    eventsByDay = raw.map((r) => ({
      date: String(r.date).slice(0, 10),
      count: Number(r.count),
    }));
  } catch {
    // tabla vacía o raw query no soportada
  }

  return NextResponse.json({
    kpis: {
      users: { total: totalUsers, thisMonth: usersThisMonth },
      events: { total: totalEvents, thisMonth: eventsThisMonth },
      motos: { total: 0, disponibles: 0, alquiladas: 0, enService: 0 },
      contratos: { activos: 0, nuevosEsteMes: 0 },
      pagos: { cobradoEsteMes: 0, pendientes: 0 },
      facturacion: { facturadoEsteMes: 0 },
    },
    recentEvents: recentEvents.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    eventsByDay,
    usersByRole: usersByRole.map((r) => ({
      role: r.role,
      count: r._count.role,
    })),
  });
}
