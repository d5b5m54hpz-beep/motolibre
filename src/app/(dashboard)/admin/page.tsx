import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { KPICards } from "./_components/kpi-cards";
import { EventsChart } from "./_components/events-chart";
import { RecentActivity } from "./_components/recent-activity";
import { UsersByRole } from "./_components/users-by-role";
import { QuickActions } from "./_components/quick-actions";

async function getDashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    usersThisMonth,
    totalEvents,
    eventsThisMonth,
    recentEvents,
    usersByRole,
    motosTotal,
    motosByEstado,
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
    prisma.moto.count(),
    prisma.moto.groupBy({
      by: ["estado"],
      _count: { estado: true },
    }),
  ]);

  // Eventos por día — fallback seguro si raw query falla
  let eventsByDay: Array<{ date: string; count: number }> = [];
  try {
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

  const estadoMap = Object.fromEntries(
    motosByEstado.map((e) => [e.estado, e._count.estado])
  );

  return {
    kpis: {
      users: { total: totalUsers, thisMonth: usersThisMonth },
      events: { total: totalEvents, thisMonth: eventsThisMonth },
      motos: {
        total: motosTotal,
        disponibles: estadoMap["DISPONIBLE"] ?? 0,
        alquiladas: estadoMap["ALQUILADA"] ?? 0,
        enService: (estadoMap["EN_SERVICE"] ?? 0) + (estadoMap["EN_REPARACION"] ?? 0),
      },
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
  };
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Bienvenido, ${session.user.name} — MotoLibre S.A.`}
      />

      <KPICards data={data.kpis} />

      <QuickActions />

      <div className="grid gap-4 lg:grid-cols-2">
        <EventsChart data={data.eventsByDay} />
        <UsersByRole data={data.usersByRole} />
      </div>

      <RecentActivity events={data.recentEvents} />
    </div>
  );
}
