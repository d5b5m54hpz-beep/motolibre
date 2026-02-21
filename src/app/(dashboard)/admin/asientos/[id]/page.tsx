import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/format";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function AsientoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const asiento = await prisma.asientoContable.findUnique({
    where: { id },
    include: {
      lineas: {
        include: {
          cuenta: { select: { codigo: true, nombre: true, tipo: true } },
        },
        orderBy: { debe: "desc" },
      },
      periodo: { select: { nombre: true } },
    },
  });

  if (!asiento) notFound();

  const totalDebe = Number(asiento.totalDebe);
  const totalHaber = Number(asiento.totalHaber);
  const balancea = Math.abs(totalDebe - totalHaber) < 0.01;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Asiento #${asiento.numero}`}
        description={`${formatDate(asiento.fecha)} — ${asiento.tipo}`}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Detalle del Asiento</CardTitle>
            {asiento.cerrado ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">Cerrado</Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500">Abierto</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-medium">{formatDate(asiento.fecha)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <Badge variant="outline">{asiento.tipo}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Período</p>
              <p className="font-medium">{asiento.periodo?.nombre ?? "—"}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Descripción</p>
            <p className="font-medium">{asiento.descripcion}</p>
          </div>

          {asiento.origenTipo && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Origen</p>
                <p className="font-medium font-mono text-sm">{asiento.origenTipo} / {asiento.origenId}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Líneas del Asiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Cuenta</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Descripción</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">DEBE</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">HABER</th>
                </tr>
              </thead>
              <tbody>
                {asiento.lineas.map((linea) => (
                  <tr key={linea.id} className="border-b">
                    <td className="py-3 px-2 font-mono text-muted-foreground">{linea.cuenta.codigo}</td>
                    <td className="py-3 px-2">{linea.cuenta.nombre}</td>
                    <td className="py-3 px-2 text-muted-foreground">{linea.descripcion ?? "—"}</td>
                    <td className="py-3 px-2 text-right font-mono">
                      {Number(linea.debe) > 0 ? formatMoney(Number(linea.debe)) : ""}
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      {Number(linea.haber) > 0 ? formatMoney(Number(linea.haber)) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td colSpan={3} className="py-3 px-2 text-right">TOTALES</td>
                  <td className="py-3 px-2 text-right font-mono">{formatMoney(totalDebe)}</td>
                  <td className="py-3 px-2 text-right font-mono">{formatMoney(totalHaber)}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="py-2 px-2 text-right">
                    {balancea ? (
                      <span className="inline-flex items-center gap-1 text-emerald-500">
                        <CheckCircle2 className="h-4 w-4" /> Asiento balanceado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <XCircle className="h-4 w-4" /> Asiento NO balancea
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
