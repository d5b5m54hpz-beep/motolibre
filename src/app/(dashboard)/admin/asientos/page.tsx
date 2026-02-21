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
    MANUAL: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    VENTA: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    COMPRA: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    DEPRECIACION: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    GASTO: "bg-red-500/10 text-red-500 border-red-500/20",
    AJUSTE: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    CIERRE: "bg-orange-500/10 text-orange-500 border-orange-500/20",
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
    { title: "Total Asientos", value: totalAsientos, icon: Calculator, color: "text-[#23e0ff]" },
    { title: "Movimiento Total", value: formatMoney(Number(totalDebe._sum.totalDebe ?? 0)), icon: TrendingUp, color: "text-emerald-500" },
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
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
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay asientos contables registrados</p>
              <p className="text-sm mt-1">Los asientos se generan automáticamente con las operaciones del negocio</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Descripción</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Debe</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Haber</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {asientos.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2">
                        <Link href={`/admin/asientos/${a.id}`} className="text-motolibre-cyan hover:underline font-mono">
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
                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500">Cerrado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500">Abierto</Badge>
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
