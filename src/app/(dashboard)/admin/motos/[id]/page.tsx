import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { QRGenerator } from "./_components/qr-generator";
import { cn } from "@/lib/utils";
import {
  Clock, FileText, Gauge, TrendingDown, Upload, Pencil,
} from "lucide-react";
import Link from "next/link";

async function getMoto(id: string) {
  return prisma.moto.findUnique({
    where: { id },
    include: {
      documentos: { orderBy: { createdAt: "desc" } },
      historialEstados: { orderBy: { createdAt: "desc" }, take: 30 },
      lecturasKm: { orderBy: { createdAt: "desc" }, take: 20 },
      baja: true,
      amortizaciones: { orderBy: { periodo: "desc" }, take: 24 },
    },
  });
}

export default async function MotoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const { id } = await params;
  const moto = await getMoto(id);
  if (!moto) notFound();

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ────────────────────────────────────── */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground transition-colors">Flota</Link>
        <span className="mx-1.5">/</span>
        <Link href="/admin/motos" className="hover:text-foreground transition-colors">Motos</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground font-medium">{moto.patente ?? "Sin patentar"}</span>
      </nav>

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tight">
            {moto.patente ?? "Sin patentar"}
          </h1>
          <p className="text-base text-muted-foreground mt-0.5">
            {moto.marca} {moto.modelo} · {moto.anio} · {moto.tipo} · <span className="font-mono tabular-nums">{moto.km.toLocaleString("es-AR")} km</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QRGenerator motoId={id} />
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <StatusBadge status={moto.estado} className="text-sm px-3 py-1" />
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <Tabs defaultValue="resumen">
        <TabsList variant="line">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="historial" className="gap-1.5">
            Historial
            <TabCount count={moto.historialEstados.length} />
          </TabsTrigger>
          <TabsTrigger value="km" className="gap-1.5">
            KM
            <TabCount count={moto.lecturasKm.length} />
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1.5">
            Documentos
            <TabCount count={moto.documentos.length} />
          </TabsTrigger>
          <TabsTrigger value="amortizacion" className="gap-1.5">
            Amortización
            <TabCount count={moto.amortizaciones.length} />
          </TabsTrigger>
        </TabsList>

        {/* Tab Resumen */}
        <TabsContent value="resumen" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Identificación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Marca" value={moto.marca} />
                <Row label="Modelo" value={moto.modelo} />
                <Row label="Año" value={String(moto.anio)} mono />
                <Row label="Tipo" value={moto.tipo} />
                <Row label="Cilindrada" value={moto.cilindrada ? `${moto.cilindrada} cc` : null} mono />
                <Row label="Color" value={moto.color} />
                <Row label="Patente" value={moto.patente} mono />
                <Row label="Nº Motor" value={moto.numMotor} mono />
                <Row label="Nº Chasis" value={moto.numChasis} mono />
                <Row label="Ubicación" value={moto.ubicacion} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Estado y Legal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <StatusBadge status={moto.estado} />
                </div>
                <Row label="Estado Legal" value={moto.estadoLegal} />
                <Row label="Patentamiento" value={moto.estadoPatentamiento} />
                <Row label="Seguro" value={moto.estadoSeguro} />
                <Row label="Aseguradora" value={moto.aseguradora} />
                <Row label="Póliza" value={moto.numPoliza} mono />
                <Row label="Vto. Seguro" value={moto.fechaFinSeguro ? formatDate(moto.fechaFinSeguro.toISOString()) : null} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Financiero</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row
                  label="Precio Compra"
                  value={moto.precioCompra ? `${formatMoney(Number(moto.precioCompra))} ${moto.monedaCompra}` : null}
                  mono
                />
                <Row label="Fecha Compra" value={moto.fechaCompra ? formatDate(moto.fechaCompra.toISOString()) : null} />
                <Row label="Proveedor" value={moto.proveedorCompra} />
                <Row label="Factura" value={moto.numFacturaCompra} mono />
                <Row
                  label="Alquiler Mensual"
                  value={moto.precioAlquilerMensual ? formatMoney(Number(moto.precioAlquilerMensual)) : null}
                  mono
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Método Amort." value={moto.metodoAmortizacion} />
                <Row label="Vida Útil" value={`${moto.vidaUtilMeses} meses`} mono />
                <Row label="Valor Residual" value={formatMoney(Number(moto.valorResidual))} mono />
                <Row label="Alta Contable" value={moto.fechaAltaContable ? formatDate(moto.fechaAltaContable.toISOString()) : null} />
              </CardContent>
            </Card>
          </div>

          {moto.notas && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{moto.notas}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Historial */}
        <TabsContent value="historial" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              {moto.historialEstados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">Sin cambios registrados</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Los cambios de estado, servicios y eventos de esta moto aparecerán aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {moto.historialEstados.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 border-l-2 border-border pl-4 pb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={h.estadoAnterior} />
                          <span className="text-muted-foreground text-xs">→</span>
                          <StatusBadge status={h.estadoNuevo} />
                        </div>
                        {h.motivo && (
                          <p className="text-xs text-muted-foreground mt-1">{h.motivo}</p>
                        )}
                        {h.userId && (
                          <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">
                            {h.userId.slice(0, 8)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                        {formatDateTime(h.createdAt.toISOString())}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab KM */}
        <TabsContent value="km" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              {moto.lecturasKm.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Gauge className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">Sin lecturas de KM</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Las lecturas de kilómetros de check-ins y servicios se registrarán aquí automáticamente.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left pb-2">KM</th>
                      <th className="text-left pb-2">Fuente</th>
                      <th className="text-left pb-2">Notas</th>
                      <th className="text-right pb-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moto.lecturasKm.map((l) => (
                      <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-2 font-mono tabular-nums font-medium">
                          {l.km.toLocaleString("es-AR")}
                        </td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">{l.fuente}</Badge>
                        </td>
                        <td className="py-2 text-muted-foreground">{l.notas ?? "—"}</td>
                        <td className="py-2 text-right text-muted-foreground font-mono tabular-nums">
                          {formatDate(l.createdAt.toISOString())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Documentos */}
        <TabsContent value="documentos" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              {moto.documentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">Sin documentos adjuntos</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Subí títulos, cédulas verdes, pólizas de seguro y otros documentos de esta moto.
                  </p>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Subir documento
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {moto.documentos.map((d) => (
                    <div key={d.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium">{d.nombre}</p>
                        <p className="text-xs text-muted-foreground">{d.tipo}</p>
                      </div>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Ver
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Amortización */}
        <TabsContent value="amortizacion" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              {moto.amortizaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TrendingDown className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">Sin datos de amortización</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    La tabla de amortización se genera automáticamente cuando se registra el alta contable de la moto.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left pb-2">Período</th>
                      <th className="text-right pb-2">Cuota</th>
                      <th className="text-right pb-2">Acumulado</th>
                      <th className="text-right pb-2">Valor en Libros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moto.amortizaciones.map((a) => (
                      <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-2 font-mono">{a.periodo}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{formatMoney(Number(a.monto))}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{formatMoney(Number(a.acumulado))}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{formatMoney(Number(a.valorLibros))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Helper: Tab count badge ─────────────────────────────────────────────────
function TabCount({ count }: { count: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-1.5 h-5 min-w-5 text-[10px] font-mono tabular-nums font-semibold",
        count > 0
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      {count}
    </span>
  );
}

// ── Helper: Detail row ──────────────────────────────────────────────────────
function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={cn("text-sm font-medium text-right", mono && "font-mono tabular-nums")}>
        {value ?? <span className="text-muted-foreground font-normal">—</span>}
      </span>
    </div>
  );
}
