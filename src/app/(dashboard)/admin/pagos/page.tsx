import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PagosTable } from "./_components/pagos-table";
import { formatMoney } from "@/lib/format";
import { DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";

async function getPagosData() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [pagos, totalRecaudado, aprobadosHoy, rechazados, pendientes] = await Promise.all([
    prisma.pagoMercadoPago.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.pagoMercadoPago.aggregate({
      where: { estado: "APROBADO" },
      _sum: { monto: true },
    }),
    prisma.pagoMercadoPago.count({
      where: { estado: "APROBADO", fechaPago: { gte: hoy } },
    }),
    prisma.pagoMercadoPago.count({ where: { estado: "RECHAZADO" } }),
    prisma.pagoMercadoPago.count({ where: { estado: "PENDIENTE" } }),
  ]);

  return {
    pagos,
    stats: {
      totalRecaudado: Number(totalRecaudado._sum.monto ?? 0),
      aprobadosHoy,
      rechazados,
      pendientes,
    },
  };
}

export default async function PagosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const { pagos, stats } = await getPagosData();

  const statCards = [
    {
      title: "Total Recaudado",
      value: formatMoney(stats.totalRecaudado),
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      title: "Confirmados Hoy",
      value: stats.aprobadosHoy,
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      title: "Pendientes",
      value: stats.pendientes,
      icon: Clock,
      color: "text-yellow-500",
    },
    {
      title: "Rechazados",
      value: stats.rechazados,
      icon: XCircle,
      color: "text-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos"
        description="Monitoreo de pagos MercadoPago — solo lectura. Los pagos se registran automáticamente vía webhook."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <PagosTable data={pagos} />
        </CardContent>
      </Card>
    </div>
  );
}
