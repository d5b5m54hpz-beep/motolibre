import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Folder, ArrowRightLeft } from "lucide-react";

interface CuentaRow {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  nivel: number;
  aceptaMovimientos: boolean;
  activa: boolean;
  descripcion: string | null;
  _count: { lineasAsiento: number; hijos: number };
}

function tipoBadgeColor(tipo: string) {
  switch (tipo) {
    case "ACTIVO": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "PASIVO": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "PATRIMONIO": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "INGRESO": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "EGRESO": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    default: return "";
  }
}

function CuentaRow({ cuenta }: { cuenta: CuentaRow }) {
  const indent = (cuenta.nivel - 1) * 24;
  const isMovimiento = cuenta.aceptaMovimientos;

  return (
    <div
      className={`flex items-center gap-3 py-2 px-4 hover:bg-muted/50 transition-colors ${
        cuenta.nivel === 1 ? "font-bold border-t border-border" : ""
      } ${cuenta.nivel === 2 ? "font-semibold" : ""}`}
      style={{ paddingLeft: `${16 + indent}px` }}
    >
      {isMovimiento ? (
        <ArrowRightLeft className="h-4 w-4 text-motolibre-cyan shrink-0" />
      ) : (
        <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
      )}

      <span className="font-mono text-sm text-muted-foreground w-28 shrink-0">
        {cuenta.codigo}
      </span>

      <span className="flex-1 text-sm truncate">
        {cuenta.nombre}
      </span>

      <Badge variant="outline" className={`text-xs ${tipoBadgeColor(cuenta.tipo)}`}>
        {cuenta.tipo}
      </Badge>

      {isMovimiento && (
        <Badge variant="outline" className="text-xs bg-motolibre-cyan/10 text-motolibre-cyan border-motolibre-cyan/20">
          Mov
        </Badge>
      )}

      {isMovimiento && cuenta._count.lineasAsiento > 0 && (
        <span className="text-xs text-muted-foreground w-16 text-right">
          {cuenta._count.lineasAsiento} mov.
        </span>
      )}

      {!cuenta.activa && (
        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500">
          Inactiva
        </Badge>
      )}
    </div>
  );
}

export default async function CuentasContablesPage() {
  const cuentas = await prisma.cuentaContable.findMany({
    orderBy: { codigo: "asc" },
    include: {
      _count: { select: { lineasAsiento: true, hijos: true } },
    },
  });

  const totalCuentas = cuentas.length;
  const cuentasMovimiento = cuentas.filter((c) => c.aceptaMovimientos).length;
  const cuentasResumen = totalCuentas - cuentasMovimiento;

  const stats = [
    { title: "Total Cuentas", value: totalCuentas, icon: BookOpen, color: "text-[#23e0ff]" },
    { title: "Cuentas de Movimiento", value: cuentasMovimiento, icon: ArrowRightLeft, color: "text-emerald-500" },
    { title: "Cuentas Resumen", value: cuentasResumen, icon: Folder, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan de Cuentas"
        description="Plan de cuentas FACPCE argentino — estructura jerárquica de 4 niveles"
      />

      <div className="grid gap-4 sm:grid-cols-3">
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
          <CardTitle>Árbol de Cuentas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {cuentas.map((cuenta) => (
              <CuentaRow
                key={cuenta.id}
                cuenta={{
                  ...cuenta,
                  _count: {
                    lineasAsiento: cuenta._count.lineasAsiento,
                    hijos: cuenta._count.hijos,
                  },
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
