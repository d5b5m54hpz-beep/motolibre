import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney, formatDate } from "@/lib/format";
import { ContratoActions } from "./_components/contrato-actions";
import { RegistrarPagoButton } from "./_components/registrar-pago-button";

const FRECUENCIA_LABEL: Record<string, string> = {
  SEMANAL: "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL: "Mensual",
};

export default async function ContratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const { id } = await params;

  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      cliente: true,
      moto: true,
      cuotas: { orderBy: { numero: "asc" } },
      mantenimientos: { orderBy: { numero: "asc" } },
    },
  });

  if (!contrato) notFound();

  const cuotasResumen = {
    total: contrato.cuotas.length,
    pagadas: contrato.cuotas.filter((c) => c.estado === "PAGADA").length,
    pendientes: contrato.cuotas.filter((c) => c.estado === "PENDIENTE").length,
    vencidas: contrato.cuotas.filter((c) => c.estado === "VENCIDA").length,
    montoPagado: contrato.cuotas
      .filter((c) => c.estado === "PAGADA")
      .reduce((sum, c) => sum + Number(c.montoPagado ?? c.monto), 0),
    montoPendiente: contrato.cuotas
      .filter((c) => c.estado === "PENDIENTE" || c.estado === "VENCIDA")
      .reduce((sum, c) => sum + Number(c.monto), 0),
  };

  const progresoPercent =
    cuotasResumen.total > 0
      ? Math.round((cuotasResumen.pagadas / cuotasResumen.total) * 100)
      : 0;

  const todasPagadas =
    cuotasResumen.total > 0 &&
    cuotasResumen.pendientes === 0 &&
    cuotasResumen.vencidas === 0;

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">Contrato</h1>
            <StatusBadge status={contrato.estado} />
            {contrato.esLeaseToOwn && (
              <span className="rounded-full bg-accent-DEFAULT/15 text-accent-DEFAULT text-xs font-semibold px-2.5 py-1">
                LEASE-TO-OWN (24 meses)
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-mono">{contrato.id}</p>
        </div>
        <ContratoActions
          contratoId={contrato.id}
          estado={contrato.estado}
          tieneOpcionCompra={contrato.tieneOpcionCompra}
          precioCompraDefault={contrato.precioCompra ? Number(contrato.precioCompra) : null}
        />
      </div>

      {/* Alerta lease-to-own completado */}
      {contrato.esLeaseToOwn && todasPagadas && contrato.estado === "ACTIVO" && (
        <div className="rounded-2xl border border-accent-DEFAULT/30 bg-accent-DEFAULT/10 p-4">
          <p className="font-semibold text-accent-DEFAULT">
            ¡Plan 24 meses completado! Moto lista para transferencia automática.
          </p>
          <p className="text-sm text-accent-DEFAULT/80 mt-1">
            Ejecuta el proceso lease-to-own para transferir la moto al rider.
          </p>
        </div>
      )}

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Partes */}
        <div className="rounded-2xl border border-border bg-bg-card/80 backdrop-blur-sm p-4 space-y-3">
          <h2 className="font-semibold text-sm">Partes del contrato</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <Link
                href={`/admin/clientes/${contrato.clienteId}`}
                className="font-medium hover:underline"
              >
                {contrato.cliente.apellido}, {contrato.cliente.nombre}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DNI</span>
              <span className="font-mono">{contrato.cliente.dni}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Moto</span>
              <Link
                href={`/admin/motos/${contrato.motoId}`}
                className="font-medium hover:underline"
              >
                {contrato.moto.marca} {contrato.moto.modelo}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patente</span>
              <span className="font-mono">{contrato.moto.patente ?? "Sin patente"}</span>
            </div>
          </div>
        </div>

        {/* Condiciones */}
        <div className="rounded-2xl border border-border bg-bg-card/80 backdrop-blur-sm p-4 space-y-3">
          <h2 className="font-semibold text-sm">Condiciones</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frecuencia</span>
              <span>{FRECUENCIA_LABEL[contrato.frecuenciaPago]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto por período</span>
              <span className="font-medium">{formatMoney(Number(contrato.montoPeriodo))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duración</span>
              <span>{contrato.duracionMeses} meses</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Depósito</span>
              <span>{formatMoney(Number(contrato.deposito))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opción compra</span>
              <span>
                {contrato.tieneOpcionCompra
                  ? contrato.precioCompra
                    ? formatMoney(Number(contrato.precioCompra))
                    : "Sí"
                  : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* Fechas */}
        <div className="rounded-2xl border border-border bg-bg-card/80 backdrop-blur-sm p-4 space-y-3">
          <h2 className="font-semibold text-sm">Fechas</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span>{formatDate(contrato.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activado</span>
              <span>{formatDate(contrato.fechaActivacion)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inicio</span>
              <span>{formatDate(contrato.fechaInicio)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fin estimado</span>
              <span>{formatDate(contrato.fechaFin)}</span>
            </div>
            {contrato.fechaFinReal && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fin real</span>
                <span>{formatDate(contrato.fechaFinReal)}</span>
              </div>
            )}
            {contrato.motivoCancelacion && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Motivo cancelación</span>
                <span className="text-right text-negative">{contrato.motivoCancelacion}</span>
              </div>
            )}
          </div>
        </div>

        {/* Resumen cuotas con progreso */}
        {cuotasResumen.total > 0 && (
          <div className="rounded-2xl border border-border bg-bg-card/80 backdrop-blur-sm p-4 space-y-3">
            <h2 className="font-semibold text-sm">Resumen cuotas</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">{cuotasResumen.pagadas}/{cuotasResumen.total}</span>
              </div>
              {/* Barra de progreso */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-positive h-2 rounded-full transition-all"
                  style={{ width: `${progresoPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{progresoPercent}% completado</p>
              {cuotasResumen.vencidas > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencidas</span>
                  <span className="text-negative font-medium">{cuotasResumen.vencidas}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground">Monto pagado</span>
                <span className="font-medium text-positive">
                  {formatMoney(cuotasResumen.montoPagado)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto pendiente</span>
                <span className="font-medium">{formatMoney(cuotasResumen.montoPendiente)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de cuotas */}
      {contrato.cuotas.length > 0 && (
        <div className="rounded-2xl border border-border bg-bg-card/80 backdrop-blur-sm">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Cuotas de pago</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">N°</th>
                  <th className="text-left p-3 font-medium">Vencimiento</th>
                  <th className="text-right p-3 font-medium">Monto</th>
                  <th className="text-left p-3 font-medium">Estado</th>
                  <th className="text-left p-3 font-medium">Fecha Pago</th>
                  <th className="text-right p-3 font-medium">Monto Pagado</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {contrato.cuotas.map((cuota) => {
                  const isVencida =
                    cuota.estado === "PENDIENTE" &&
                    new Date(cuota.fechaVencimiento) < now;
                  return (
                    <tr
                      key={cuota.id}
                      className={`border-b border-border last:border-0 ${isVencida ? "bg-negative-bg" : ""}`}
                    >
                      <td className="p-3 font-mono">{cuota.numero}</td>
                      <td className="p-3">
                        <span className={isVencida ? "text-negative" : ""}>
                          {formatDate(cuota.fechaVencimiento)}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatMoney(Number(cuota.monto))}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={isVencida ? "VENCIDA" : cuota.estado} />
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {cuota.fechaPago ? formatDate(cuota.fechaPago) : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {cuota.montoPagado ? formatMoney(Number(cuota.montoPagado)) : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {(cuota.estado === "PENDIENTE" ||
                          cuota.estado === "VENCIDA" ||
                          cuota.estado === "PARCIAL" ||
                          isVencida) && (
                          <RegistrarPagoButton
                            contratoId={contrato.id}
                            cuotaId={cuota.id}
                            cuotaNumero={cuota.numero}
                            montoCuota={Number(cuota.monto)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {contrato.cuotas.length === 0 && contrato.estado === "BORRADOR" && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p>Las cuotas se generarán automáticamente al activar el contrato.</p>
        </div>
      )}

      {/* Mantenimientos programados */}
      {contrato.mantenimientos.length > 0 && (
        <div className="rounded-2xl border border-border bg-bg-card/80 backdrop-blur-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">
              Mantenimientos Programados ({contrato.mantenimientos.length})
            </h2>
            <Link
              href={`/admin/mantenimientos?contratoId=${contrato.id}`}
              className="text-sm text-accent-DEFAULT hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">N°</th>
                  <th className="text-left p-3 font-medium">Fecha Programada</th>
                  <th className="text-left p-3 font-medium">Estado</th>
                  <th className="text-left p-3 font-medium">Fecha Realizada</th>
                  <th className="text-left p-3 font-medium">Notas Operador</th>
                </tr>
              </thead>
              <tbody>
                {contrato.mantenimientos.map((mant) => {
                  const isVencido =
                    mant.estado === "PROGRAMADO" && new Date(mant.fechaProgramada) < now;
                  return (
                    <tr
                      key={mant.id}
                      className={`border-b border-border last:border-0 ${isVencido ? "bg-warning-bg" : ""}`}
                    >
                      <td className="p-3 font-mono">#{mant.numero}</td>
                      <td className="p-3">
                        <span className={isVencido ? "text-warning font-medium" : ""}>
                          {formatDate(mant.fechaProgramada)}
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={mant.estado} />
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {mant.fechaRealizada ? formatDate(mant.fechaRealizada) : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {mant.notasOperador ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {contrato.notas && (
        <div className="rounded-2xl border border-border bg-bg-card/80 backdrop-blur-sm p-4">
          <h2 className="font-semibold text-sm mb-2">Notas</h2>
          <p className="text-sm text-muted-foreground">{contrato.notas}</p>
        </div>
      )}
    </div>
  );
}
