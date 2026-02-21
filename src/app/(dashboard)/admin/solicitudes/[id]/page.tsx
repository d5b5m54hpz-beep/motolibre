import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney, formatDate } from "@/lib/format";
import { SolicitudActions } from "./_components/solicitud-actions";

const PLAN_LABEL: Record<string, string> = {
  MESES_3: "3 meses",
  MESES_6: "6 meses",
  MESES_9: "9 meses",
  MESES_12: "12 meses",
  MESES_24: "24 meses",
};

export default async function SolicitudDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const { id } = await params;

  const solicitud = await prisma.solicitud.findUnique({
    where: { id },
    include: {
      cliente: {
        include: {
          documentos: { orderBy: { createdAt: "desc" } },
        },
      },
      moto: true,
      contrato: { select: { id: true, estado: true } },
    },
  });

  if (!solicitud) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Solicitud</h1>
            <StatusBadge status={solicitud.estado} />
          </div>
          <p className="text-sm text-muted-foreground font-mono">{solicitud.id}</p>
          <p className="text-sm text-muted-foreground">
            Recibida: {formatDate(solicitud.createdAt)}
          </p>
        </div>
        <SolicitudActions solicitudId={solicitud.id} estado={solicitud.estado} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cliente */}
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold text-sm">Cliente</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre</span>
              <Link
                href={`/admin/clientes/${solicitud.clienteId}`}
                className="font-medium hover:underline"
              >
                {solicitud.cliente.apellido}, {solicitud.cliente.nombre}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DNI</span>
              <span className="font-mono">{solicitud.cliente.dni}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{solicitud.cliente.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teléfono</span>
              <span>{solicitud.cliente.telefono}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado cliente</span>
              <StatusBadge status={solicitud.cliente.estado} />
            </div>
          </div>
        </div>

        {/* Solicitud */}
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold text-sm">Solicitud</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modelo deseado</span>
              <span className="font-medium">
                {solicitud.marcaDeseada} {solicitud.modeloDeseado}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Condición</span>
              <span>{solicitud.condicionDeseada}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span>{PLAN_LABEL[solicitud.plan]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio semanal</span>
              <span className="font-medium">{formatMoney(Number(solicitud.precioSemanal))}</span>
            </div>
            {solicitud.precioMensual && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio mensual</span>
                <span className="font-medium">{formatMoney(Number(solicitud.precioMensual))}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1">
              <span className="text-muted-foreground">1er mes pagado</span>
              <span className="font-bold text-green-500">
                {formatMoney(Number(solicitud.montoPrimerMes))}
              </span>
            </div>
          </div>
        </div>

        {/* Pago */}
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold text-sm">Pago Adelantado</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha pago</span>
              <span>{formatDate(solicitud.fechaPago)}</span>
            </div>
            {solicitud.mpPaymentId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">MP Payment ID</span>
                <span className="font-mono text-xs">{solicitud.mpPaymentId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Lista de espera / Asignación */}
        {(solicitud.prioridadEspera !== null || solicitud.moto) && (
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="font-semibold text-sm">Lista de Espera / Asignación</h2>
            <div className="space-y-2 text-sm">
              {solicitud.prioridadEspera !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posición en cola</span>
                  <span className="font-bold text-xl">#{solicitud.prioridadEspera}</span>
                </div>
              )}
              {solicitud.moto && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Moto asignada</span>
                    <Link
                      href={`/admin/motos/${solicitud.motoAsignadaId}`}
                      className="font-medium hover:underline"
                    >
                      {solicitud.moto.marca} {solicitud.moto.modelo}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patente</span>
                    <span className="font-mono">{solicitud.moto.patente ?? "—"}</span>
                  </div>
                </>
              )}
              {solicitud.fechaAsignacion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha asignación</span>
                  <span>{formatDate(solicitud.fechaAsignacion)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rechazo */}
      {solicitud.motivoRechazo && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4">
          <h2 className="font-semibold text-sm text-red-600 mb-1">Motivo de rechazo</h2>
          <p className="text-sm text-red-600">{solicitud.motivoRechazo}</p>
          {solicitud.fechaEvaluacion && (
            <p className="text-xs text-red-400 mt-1">
              Evaluado: {formatDate(solicitud.fechaEvaluacion)}
            </p>
          )}
        </div>
      )}

      {/* Documentos del cliente */}
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">
            Documentos del Cliente ({solicitud.cliente.documentos.length})
          </h2>
        </div>
        {solicitud.cliente.documentos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            El cliente no ha subido documentos aún.
          </div>
        ) : (
          <div className="divide-y">
            {solicitud.cliente.documentos.map((doc) => (
              <div key={doc.id} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{doc.nombre}</p>
                  <p className="text-xs text-muted-foreground">{doc.tipo}</p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.verificado && (
                    <span className="text-xs text-green-500 font-medium">✓ Verificado</span>
                  )}
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-xs"
                  >
                    Ver
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contrato generado */}
      {solicitud.contrato && (
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold text-sm mb-2">Contrato Generado</h2>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/admin/contratos/${solicitud.contrato.id}`}
              className="text-blue-500 hover:underline font-mono"
            >
              {solicitud.contrato.id}
            </Link>
            <StatusBadge status={solicitud.contrato.estado} />
          </div>
        </div>
      )}
    </div>
  );
}
