import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/format";
import { Calculator, Plus, TrendingUp, FileText } from "lucide-react";
import Link from "next/link";

function tipoAsientoBadge(tipo: string) {
  const colors: Record<string, string> = {
    MANUAL: "bg-t-tertiary/10 text-t-tertiary border-t-tertiary/20",
    VENTA: "bg-positive/10 text-positive border-positive/20",
    COMPRA: "bg-ds-info/10 text-ds-info border-ds-info/20",
    DEPRECIACION: "bg-warning/10 text-warning border-warning/20",
    GASTO: "bg-negative/10 text-negative border-negative/20",
    AJUSTE: "bg-accent-DEFAULT/10 text-accent-DEFAULT border-accent-DEFAULT/20",
    CIERRE: "bg-warning/10 text-warning border-warning/20",
  };
  return colors[tipo] ?? "";
}

export default async function AsientosPage() {
  const [asientos, totalAsientos, totalDebe] = await Promise.all([
    prisma.asientoContable.findMany({
      orderBy: { fecha: "desc" },
      take: 100,
      include: {
        periodo: { select: { nombre: true } },
        _count: { select: { lineas: true } },
      },
    }),
    prisma.asientoContable.count(),
    prisma.asientoContable.aggregate({
      _sum: { totalDebe: true },
    }),
  ]);

  const stats = [
    { title: "Total Asientos", value: totalAsientos, icon: Calculator, color: "text-accent-DEFAULT" },
    { title: "Movimiento Total", value: formatMoney(Number(totalDebe._sum.totalDebe ?? 0)), icon: TrendingUp, color: "text-positive" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asientos Contables"
        description="Libro diario — asientos en partida doble"
        actions={
          <Link href="/admin/asientos/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Asiento
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Asientos</CardTitle>
        </CardHeader>
        <CardContent>
          {asientos.length === 0 ? (
            <div className="text-center py-12 text-t-secondary">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay asientos contables registrados</p>
              <p className="text-sm mt-1">Los asientos se generan automáticamente con las operaciones del negocio</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">#</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Fecha</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Tipo</th>
                    <th className="text-left py-3 px-2 font-medium text-t-secondary">Descripción</th>
                    <th className="text-right py-3 px-2 font-medium text-t-secondary">Debe</th>
                    <th className="text-right py-3 px-2 font-medium text-t-secondary">Haber</th>
                    <th className="text-center py-3 px-2 font-medium text-t-secondary">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {asientos.map((a) => (
                    <tr key={a.id} className="border-b border-border hover:bg-bg-card-hover transition-colors">
                      <td className="py-3 px-2">
                        <Link href={`/admin/asientos/${a.id}`} className="text-accent-DEFAULT hover:underline font-mono">
                          {a.numero}
                        </Link>
                      </td>
                      <td className="py-3 px-2">{formatDate(a.fecha)}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className={`text-xs ${tipoAsientoBadge(a.tipo)}`}>
                          {a.tipo}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 max-w-xs truncate">{a.descripcion}</td>
                      <td className="py-3 px-2 text-right font-mono">{formatMoney(Number(a.totalDebe))}</td>
                      <td className="py-3 px-2 text-right font-mono">{formatMoney(Number(a.totalHaber))}</td>
                      <td className="py-3 px-2 text-center">
                        {a.cerrado ? (
                          <Badge variant="outline" className="text-xs bg-positive/10 text-positive">Cerrado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-ds-info/10 text-ds-info">Abierto</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
