import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Folder, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    case "ACTIVO": return "bg-ds-info/10 text-ds-info border-ds-info/20";
    case "PASIVO": return "bg-negative/10 text-negative border-negative/20";
    case "PATRIMONIO": return "bg-accent-DEFAULT/10 text-accent-DEFAULT border-accent-DEFAULT/20";
    case "INGRESO": return "bg-positive/10 text-positive border-positive/20";
    case "EGRESO": return "bg-warning/10 text-warning border-warning/20";
    default: return "";
  }
}

function CuentaRow({ cuenta }: { cuenta: CuentaRow }) {
  const indent = (cuenta.nivel - 1) * 24;
  const isMovimiento = cuenta.aceptaMovimientos;

  return (
    <div
      className={`flex items-center gap-3 py-2 px-4 hover:bg-bg-card-hover transition-colors ${
        cuenta.nivel === 1 ? "font-bold border-t border-border" : ""
      } ${cuenta.nivel === 2 ? "font-semibold" : ""}`}
      style={{ paddingLeft: `${16 + indent}px` }}
    >
      {isMovimiento ? (
        <ArrowRightLeft className="h-4 w-4 text-accent-DEFAULT shrink-0" />
      ) : (
        <Folder className="h-4 w-4 text-t-secondary shrink-0" />
      )}

      <span className="font-mono text-sm text-t-tertiary w-28 shrink-0">
        {cuenta.codigo}
      </span>

      <span className={`flex-1 text-sm truncate ${isMovimiento ? "text-t-primary font-medium" : "text-t-secondary font-semibold"}`}>
        {cuenta.nombre}
      </span>

      <Badge variant="outline" className={`text-xs ${tipoBadgeColor(cuenta.tipo)}`}>
        {cuenta.tipo}
      </Badge>

      {isMovimiento && (
        <Badge variant="outline" className="text-xs bg-accent-DEFAULT/10 text-accent-DEFAULT border-accent-DEFAULT/20">
          Mov
        </Badge>
      )}

      {isMovimiento && cuenta._count.lineasAsiento > 0 && (
        <span className="text-xs text-t-tertiary w-16 text-right">
          {cuenta._count.lineasAsiento} mov.
        </span>
      )}

      {!cuenta.activa && (
        <Badge variant="outline" className="text-xs bg-negative/10 text-negative">
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
    { title: "Total Cuentas", value: totalCuentas, icon: BookOpen, color: "text-accent-DEFAULT" },
    { title: "Cuentas de Movimiento", value: cuentasMovimiento, icon: ArrowRightLeft, color: "text-positive" },
    { title: "Cuentas Resumen", value: cuentasResumen, icon: Folder, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan de Cuentas"
        description="Plan de cuentas FACPCE argentino — estructura jerárquica de 4 niveles"
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/asientos">Asientos</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/periodos">Períodos</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
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
