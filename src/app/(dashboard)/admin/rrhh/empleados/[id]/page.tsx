import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/format";

async function getEmpleado(id: string) {
  return prisma.empleado.findUnique({
    where: { id },
    include: {
      ausencias: { orderBy: { createdAt: "desc" }, take: 30 },
      recibos: { orderBy: { createdAt: "desc" }, take: 24 },
      documentos: { orderBy: { createdAt: "desc" } },
    },
  });
}

export default async function EmpleadoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const { id } = await params;
  const empleado = await getEmpleado(id);
  if (!empleado) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${empleado.apellido}, ${empleado.nombre}`}
        description={`Legajo ${empleado.legajo} · ${empleado.departamento} · ${empleado.cargo}`}
        actions={
          <StatusBadge
            status={empleado.estado}
            className="text-sm px-3 py-1"
          />
        }
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="ausencias">
            Ausencias ({empleado.ausencias.length})
          </TabsTrigger>
          <TabsTrigger value="recibos">
            Recibos ({empleado.recibos.length})
          </TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos ({empleado.documentos.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Info */}
        <TabsContent value="info" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Datos Personales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Nombre" value={empleado.nombre} />
                <Row label="Apellido" value={empleado.apellido} />
                <Row label="DNI" value={empleado.dni} />
                <Row label="CUIL" value={empleado.cuil} />
                <Row label="Sexo" value={empleado.sexo} />
                <Row label="Estado Civil" value={empleado.estadoCivil} />
                <Row
                  label="Fecha Nacimiento"
                  value={
                    empleado.fechaNacimiento
                      ? formatDate(empleado.fechaNacimiento.toISOString())
                      : null
                  }
                />
                <Row label="Nacionalidad" value={empleado.nacionalidad} />
                <Row label="Dirección" value={empleado.direccion} />
                <Row label="Teléfono" value={empleado.telefono} />
                <Row label="Email" value={empleado.email} />
                <Row
                  label="Contacto Emergencia"
                  value={empleado.contactoEmergencia}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Datos Laborales y Bancarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Legajo" value={empleado.legajo} />
                <Row label="Departamento" value={empleado.departamento} />
                <Row label="Cargo" value={empleado.cargo} />
                <div className="flex justify-between gap-2">
                  <span className="text-t-secondary">Estado</span>
                  <StatusBadge status={empleado.estado} />
                </div>
                <Row
                  label="Fecha Ingreso"
                  value={formatDate(empleado.fechaIngreso.toISOString())}
                />
                <Row
                  label="Fecha Egreso"
                  value={
                    empleado.fechaEgreso
                      ? formatDate(empleado.fechaEgreso.toISOString())
                      : null
                  }
                />
                <Row label="Jornada" value={empleado.jornada} />
                <Row
                  label="Sueldo Básico"
                  value={formatMoney(Number(empleado.sueldoBasico))}
                />
                <Row label="Categoría CCT" value={empleado.categoriaCCT} />
                <Row label="CBU" value={empleado.cbu} />
                <Row label="Banco" value={empleado.banco} />
                <Row label="Tipo Cuenta" value={empleado.tipoCuenta} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ART y Obra Social</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="ART" value={empleado.artNombre} />
                <Row label="Nº ART" value={empleado.artNumero} />
                <Row label="Obra Social" value={empleado.obraSocialNombre} />
                <Row label="Nº Obra Social" value={empleado.obraSocialNumero} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Ausencias */}
        <TabsContent value="ausencias" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              {empleado.ausencias.length === 0 ? (
                <p className="text-sm text-t-secondary text-center py-8">
                  Sin ausencias registradas
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-t-secondary border-b border-border">
                        <th className="text-left pb-2">Tipo</th>
                        <th className="text-left pb-2">Desde — Hasta</th>
                        <th className="text-center pb-2">Días Hábiles</th>
                        <th className="text-center pb-2">Estado</th>
                        <th className="text-left pb-2">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empleado.ausencias.map((a) => (
                        <tr
                          key={a.id}
                          className="border-b border-border last:border-0 hover:bg-bg-card-hover transition-colors"
                        >
                          <td className="py-2">
                            <Badge variant="outline" className="text-xs">
                              {a.tipo.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-2">
                            {formatDate(a.fechaDesde.toISOString())} —{" "}
                            {formatDate(a.fechaHasta.toISOString())}
                          </td>
                          <td className="py-2 text-center tabular-nums font-medium">
                            {a.diasHabiles}
                          </td>
                          <td className="py-2 text-center">
                            <StatusBadge status={a.estado} />
                          </td>
                          <td className="py-2 text-t-secondary">
                            {a.motivo ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Recibos */}
        <TabsContent value="recibos" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              {empleado.recibos.length === 0 ? (
                <p className="text-sm text-t-secondary text-center py-8">
                  Sin recibos de sueldo
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-t-secondary border-b border-border">
                        <th className="text-left pb-2">Número</th>
                        <th className="text-left pb-2">Período</th>
                        <th className="text-left pb-2">Tipo</th>
                        <th className="text-right pb-2">Total Haberes</th>
                        <th className="text-right pb-2">Total Deducciones</th>
                        <th className="text-right pb-2">Neto a Pagar</th>
                        <th className="text-center pb-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empleado.recibos.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-border last:border-0 hover:bg-bg-card-hover transition-colors"
                        >
                          <td className="py-2 font-mono text-xs font-medium">
                            {r.numero}
                          </td>
                          <td className="py-2 font-mono">{r.periodo}</td>
                          <td className="py-2">
                            <Badge variant="outline" className="text-xs">
                              {r.tipo}
                            </Badge>
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {formatMoney(Number(r.totalHaberes))}
                          </td>
                          <td className="py-2 text-right tabular-nums text-negative">
                            {formatMoney(Number(r.totalDeducciones))}
                          </td>
                          <td className="py-2 text-right tabular-nums font-medium">
                            {formatMoney(Number(r.netoAPagar))}
                          </td>
                          <td className="py-2 text-center">
                            <StatusBadge status={r.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Documentos */}
        <TabsContent value="documentos" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              {empleado.documentos.length === 0 ? (
                <p className="text-sm text-t-secondary text-center py-8">
                  Sin documentos cargados
                </p>
              ) : (
                <div className="space-y-2">
                  {empleado.documentos.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between border border-border rounded-2xl p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-t-primary">
                          {d.nombre}
                        </p>
                        <p className="text-xs text-t-secondary">
                          {d.tipo.replace(/_/g, " ")}
                          {d.fechaVencimiento
                            ? ` · Vto: ${formatDate(d.fechaVencimiento.toISOString())}`
                            : ""}
                        </p>
                        {d.notas && (
                          <p className="text-xs text-t-tertiary mt-1">
                            {d.notas}
                          </p>
                        )}
                      </div>
                      {d.archivoUrl && (
                        <a
                          href={d.archivoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent-DEFAULT hover:underline"
                        >
                          Ver
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-t-secondary">{label}</span>
      <span className="font-medium text-right text-t-primary">
        {value ?? "—"}
      </span>
    </div>
  );
}
