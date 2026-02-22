import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/format";
import { AprobarRechazarButtons } from "./_components/aprobar-rechazar-buttons";

async function getCliente(id: string) {
  return prisma.cliente.findUnique({
    where: { id },
    include: {
      documentos: { orderBy: { createdAt: "desc" } },
      puntajes: { orderBy: { createdAt: "desc" } },
    },
  });
}

async function getHistorial(clienteId: string) {
  return prisma.businessEvent.findMany({
    where: { entityType: "Cliente", entityId: clienteId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, operationId: true, status: true, createdAt: true },
  });
}

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const { id } = await params;
  const [cliente, historial] = await Promise.all([getCliente(id), getHistorial(id)]);
  if (!cliente) notFound();

  const titulo = `${cliente.apellido}, ${cliente.nombre}`;
  const scoreAvg =
    cliente.puntajes.length > 0
      ? Math.round(
          cliente.puntajes.reduce((sum, p) => sum + p.valor, 0) / cliente.puntajes.length
        )
      : null;

  const canApprove =
    cliente.estado === "PENDIENTE" || cliente.estado === "EN_REVISION";

  return (
    <div className="space-y-6">
      <PageHeader
        title={titulo}
        description={`DNI ${cliente.dni} · ${cliente.email}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={cliente.estado} className="text-sm px-3 py-1" />
            {canApprove && <AprobarRechazarButtons clienteId={cliente.id} />}
          </div>
        }
      />

      {cliente.motivoRechazo && (
        <div className="rounded-2xl border border-negative/30 bg-negative-bg p-3 text-sm text-negative">
          <strong>Motivo de rechazo:</strong> {cliente.motivoRechazo}
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="documentos">Documentos ({cliente.documentos.length})</TabsTrigger>
          <TabsTrigger value="scoring">
            Scoring {scoreAvg !== null ? `(${scoreAvg}/100)` : ""}
          </TabsTrigger>
          <TabsTrigger value="historial">Historial ({historial.length})</TabsTrigger>
        </TabsList>

        {/* Tab Info */}
        <TabsContent value="info" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Datos Personales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Nombre" value={`${cliente.nombre} ${cliente.apellido}`} />
                <Row label="Email" value={cliente.email} />
                <Row label="Teléfono" value={cliente.telefono} />
                <Row label="Teléfono Alt." value={cliente.telefonoAlt} />
                <Row label="DNI" value={cliente.dni} />
                <Row
                  label="Nacimiento"
                  value={
                    cliente.fechaNacimiento
                      ? formatDate(cliente.fechaNacimiento.toISOString())
                      : null
                  }
                />
                <Row label="Género" value={cliente.genero} />
                <Row label="Nacionalidad" value={cliente.nacionalidad} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Licencia de Conducir</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Tipo" value={cliente.tipoLicencia} />
                <Row label="Número" value={cliente.numLicencia} />
                <Row
                  label="Vencimiento"
                  value={
                    cliente.fechaVencLicencia
                      ? formatDate(cliente.fechaVencLicencia.toISOString())
                      : null
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dirección</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row
                  label="Dirección"
                  value={
                    cliente.calle
                      ? `${cliente.calle} ${cliente.numero ?? ""}${cliente.piso ? ` P${cliente.piso}` : ""}${cliente.depto ? ` D${cliente.depto}` : ""}`
                      : null
                  }
                />
                <Row label="Localidad" value={cliente.localidad} />
                <Row label="Provincia" value={cliente.provincia} />
                <Row label="CP" value={cliente.codigoPostal} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fiscal y Delivery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="CUIT" value={cliente.cuit} />
                <Row label="Condición IVA" value={cliente.condicionIva.replace(/_/g, " ")} />
                <Row label="Plataformas" value={cliente.plataformas} />
                <Row
                  label="Experiencia"
                  value={
                    cliente.experienciaMeses !== null
                      ? `${cliente.experienciaMeses} meses`
                      : null
                  }
                />
                <Row label="Cómo nos conoció" value={cliente.comoNosConocio} />
                <Row label="Referido por" value={cliente.referidoPor} />
              </CardContent>
            </Card>
          </div>

          {cliente.notas && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-t-secondary">{cliente.notas}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Documentos */}
        <TabsContent value="documentos" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              {cliente.documentos.length === 0 ? (
                <p className="text-sm text-t-secondary text-center py-8">
                  Sin documentos. El upload a R2 se conecta en fases posteriores.
                </p>
              ) : (
                <div className="space-y-2">
                  {cliente.documentos.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between border border-border rounded-2xl p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-t-primary">{d.nombre}</p>
                        <p className="text-xs text-t-secondary">
                          {d.tipo.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={d.verificado ? "default" : "outline"} className="text-xs">
                          {d.verificado ? "Verificado" : "Pendiente"}
                        </Badge>
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent-DEFAULT hover:underline"
                        >
                          Ver
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Scoring */}
        <TabsContent value="scoring" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Score del Rider</CardTitle>
                {scoreAvg !== null && (
                  <span
                    className={`text-2xl font-bold ${
                      scoreAvg >= 70
                        ? "text-positive"
                        : scoreAvg >= 40
                          ? "text-warning"
                          : "text-negative"
                    }`}
                  >
                    {scoreAvg}/100
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {cliente.puntajes.length === 0 ? (
                <p className="text-sm text-t-secondary text-center py-8">
                  Sin puntajes registrados todavía.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-t-secondary border-b border-border">
                      <th className="text-left pb-2">Categoría</th>
                      <th className="text-right pb-2">Valor</th>
                      <th className="text-left pb-2 pl-4">Motivo</th>
                      <th className="text-right pb-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cliente.puntajes.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg-card-hover transition-colors">
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {p.categoria.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium">{p.valor}</td>
                        <td className="py-2 pl-4 text-t-secondary">{p.motivo ?? "—"}</td>
                        <td className="py-2 text-right text-t-tertiary">
                          {formatDate(p.createdAt.toISOString())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Historial */}
        <TabsContent value="historial" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              {historial.length === 0 ? (
                <p className="text-sm text-t-secondary text-center py-8">
                  Sin eventos registrados.
                </p>
              ) : (
                <div className="space-y-3">
                  {historial.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between border-l-2 border-border pl-4 pb-3"
                    >
                      <div>
                        <p className="text-sm font-mono">{h.operationId}</p>
                        <StatusBadge status={h.status} className="text-xs mt-1" />
                      </div>
                      <span className="text-xs text-t-tertiary whitespace-nowrap">
                        {formatDateTime(h.createdAt.toISOString())}
                      </span>
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

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-t-secondary">{label}</span>
      <span className="font-medium text-right text-t-primary">{value ?? "—"}</span>
    </div>
  );
}
