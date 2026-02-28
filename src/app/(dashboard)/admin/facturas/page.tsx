import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FacturasTable } from "./_components/facturas-table";
import { formatMoney } from "@/lib/format";
import { Receipt, TrendingUp, Clock, ShieldCheck, ShieldAlert } from "lucide-react";
import { getAfipEntorno } from "@/lib/services/afip-service";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function FacturasPage() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [facturas, totalMes, emitidas, pendientesEnvio, pendientesCAE] = await Promise.all([
    prisma.factura.findMany({
      orderBy: { fechaEmision: "desc" },
      take: 100,
    }),
    prisma.factura.aggregate({
      where: { fechaEmision: { gte: inicioMes }, estado: { not: "ANULADA" } },
      _sum: { montoTotal: true },
    }),
    prisma.factura.count({
      where: { fechaEmision: { gte: hoy, lt: manana } },
    }),
    prisma.factura.count({
      where: { estado: "GENERADA" },
    }),
    prisma.factura.count({
      where: { afipResultado: { in: ["PENDIENTE", "R"] } },
    }),
  ]);

  const entorno = getAfipEntorno();

  const stats = [
    {
      title: "Facturado este Mes",
      value: formatMoney(Number(totalMes._sum.montoTotal ?? 0)),
      icon: TrendingUp,
      color: "text-positive",
    },
    {
      title: "Emitidas Hoy",
      value: emitidas,
      icon: Receipt,
      color: "text-accent-DEFAULT",
    },
    {
      title: "Pendientes de Envío",
      value: pendientesEnvio,
      icon: Clock,
      color: "text-warning",
    },
    {
      title: "Pendientes CAE",
      value: pendientesCAE,
      icon: pendientesCAE > 0 ? ShieldAlert : ShieldCheck,
      color: pendientesCAE > 0 ? "text-destructive" : "text-positive",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturas"
        description="Comprobantes emitidos automáticamente al confirmar pagos"
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/notas-credito">Notas de Crédito</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/facturas-compra">Facturas Compra</Link>
            </Button>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              entorno === "produccion"
                ? "bg-positive-bg text-positive"
                : entorno === "homologacion"
                ? "bg-info-bg text-ds-info"
                : "bg-warning/10 text-warning"
            }`}>
              AFIP: {entorno === "produccion" ? "Producción" : entorno === "homologacion" ? "Homologación" : "Stub"}
            </span>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-t-secondary">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FacturasTable data={facturas} />
    </div>
  );
}
