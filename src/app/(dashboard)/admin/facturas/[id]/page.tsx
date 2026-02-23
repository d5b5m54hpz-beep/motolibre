import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { FileText, ArrowLeft, Send, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { FacturaEnviarButton } from "./_components/factura-enviar-button";
import { ReintentarCAEButton } from "./_components/reintentar-cae-button";

export default async function FacturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const factura = await prisma.factura.findUnique({ where: { id } });
  if (!factura) notFound();

  const pago = factura.pagoMPId
    ? await prisma.pagoMercadoPago.findUnique({ where: { id: factura.pagoMPId } })
    : null;

  const montoNeto = Number(factura.montoNeto);
  const montoIva = Number(factura.montoIva);
  const montoTotal = Number(factura.montoTotal);

  const showRetryButton = factura.afipResultado === "PENDIENTE" || factura.afipResultado === "R";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Factura ${factura.numeroCompleto}`}
        description={`Emitida el ${new Date(factura.fechaEmision).toLocaleDateString("es-AR")}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/facturas">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/api/facturas/${id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Ver PDF
              </a>
            </Button>
            <FacturaEnviarButton facturaId={id} />
            {showRetryButton && <ReintentarCAEButton facturaId={id} />}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vista de la factura */}
        <Card className="lg:col-span-2">
          <CardContent className="p-8">
            {/* Header factura */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">{factura.emisorRazonSocial}</h2>
                <p className="text-sm text-t-secondary">CUIT: {factura.emisorCuit}</p>
                <p className="text-sm text-t-secondary">{factura.emisorCondicionIva}</p>
                <p className="text-sm text-t-secondary">{factura.emisorDomicilio}</p>
              </div>
              <div className="text-right">
                <div
                  className={`inline-flex items-center justify-center w-16 h-16 border-2 rounded text-4xl font-black ${
                    factura.tipo === "A"
                      ? "border-ds-info text-ds-info"
                      : "border-positive text-positive"
                  }`}
                >
                  {factura.tipo}
                </div>
                <p className="text-sm mt-2 font-mono font-medium">{factura.numeroCompleto}</p>
                <p className="text-xs text-t-secondary">
                  {new Date(factura.fechaEmision).toLocaleDateString("es-AR")}
                </p>
                <div className="mt-2">
                  <StatusBadge status={factura.estado} />
                </div>
              </div>
            </div>

            {/* Receptor */}
            <div className="border border-border rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-semibold mb-2 text-t-secondary uppercase tracking-wide">
                Receptor
              </h3>
              <p className="font-medium">{factura.receptorNombre}</p>
              {factura.receptorCuit && (
                <p className="text-sm text-t-secondary">CUIT/DNI: {factura.receptorCuit}</p>
              )}
              <p className="text-sm text-t-secondary">{factura.receptorCondicionIva}</p>
              {factura.receptorDomicilio && (
                <p className="text-sm text-t-secondary">{factura.receptorDomicilio}</p>
              )}
            </div>

            {/* Tabla de ítems */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-sm font-semibold text-t-secondary">Descripción</th>
                  <th className="text-right py-2 text-sm font-semibold text-t-secondary">Cant.</th>
                  <th className="text-right py-2 text-sm font-semibold text-t-secondary">P. Unit.</th>
                  <th className="text-right py-2 text-sm font-semibold text-t-secondary">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3 text-sm">{factura.concepto}</td>
                  <td className="py-3 text-right text-sm">1</td>
                  <td className="py-3 text-right text-sm font-mono">{formatMoney(montoNeto)}</td>
                  <td className="py-3 text-right text-sm font-mono">{formatMoney(montoNeto)}</td>
                </tr>
              </tbody>
            </table>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-64">
                {factura.tipo === "A" && (
                  <>
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-t-secondary">Subtotal neto:</span>
                      <span className="font-mono">{formatMoney(montoNeto)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-t-secondary">IVA 21%:</span>
                      <span className="font-mono">{formatMoney(montoIva)}</span>
                    </div>
                    <div className="border-t border-border mt-1 pt-1" />
                  </>
                )}
                <div className="flex justify-between py-1">
                  <span className="font-bold">
                    {factura.tipo === "B" ? "TOTAL (IVA incl.):" : "TOTAL:"}
                  </span>
                  <span className="font-bold font-mono text-lg">{formatMoney(montoTotal)}</span>
                </div>
              </div>
            </div>

            {/* CAE */}
            {factura.cae && (
              <div className="border-t border-border mt-6 pt-4">
                <p className="text-xs text-t-secondary">
                  CAE: <span className="font-mono">{factura.cae}</span>
                  {factura.caeVencimiento && (
                    <span className="ml-4">
                      Vto. CAE: {new Date(factura.caeVencimiento).toLocaleDateString("es-AR")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-t-secondary mt-1">
                  Comprobante emitido conforme a las normas de la RG 1415/2003 y sus modificaciones — AFIP
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info AFIP */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Estado AFIP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-t-secondary">Resultado:</span>
              <AFIPResultadoBadge resultado={factura.afipResultado} />
            </div>
            {factura.cae && (
              <div className="flex justify-between">
                <span className="text-t-secondary">CAE:</span>
                <span className="font-mono text-xs">{factura.cae}</span>
              </div>
            )}
            {factura.caeVencimiento && (
              <div className="flex justify-between">
                <span className="text-t-secondary">Vto. CAE:</span>
                <span>{new Date(factura.caeVencimiento).toLocaleDateString("es-AR")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-t-secondary">Reintentos:</span>
              <span>{factura.afipReintentos}</span>
            </div>
            {factura.afipObservaciones && (
              <div className="border-t border-border pt-2">
                <p className="text-xs text-t-secondary mb-1">Observaciones AFIP:</p>
                <p className="text-xs text-destructive">{factura.afipObservaciones}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info pago asociado */}
        {pago && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pago Asociado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-t-secondary">ID MP:</span>
                <span className="font-mono">{pago.mpPaymentId ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-t-secondary">Monto:</span>
                <span className="font-mono">{formatMoney(Number(pago.monto))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-t-secondary">Estado:</span>
                <StatusBadge status={pago.estado} />
              </div>
              {pago.mpPaymentMethodId && (
                <div className="flex justify-between">
                  <span className="text-t-secondary">Método:</span>
                  <span>{pago.mpPaymentMethodId}</span>
                </div>
              )}
              {pago.fechaPago && (
                <div className="flex justify-between">
                  <span className="text-t-secondary">Fecha pago:</span>
                  <span>{new Date(pago.fechaPago).toLocaleDateString("es-AR")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info contrato */}
        {factura.contratoId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contrato Asociado</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/contratos/${factura.contratoId}`}>
                  <Send className="mr-2 h-4 w-4" />
                  Ver Contrato
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function AFIPResultadoBadge({ resultado }: { resultado: string | null }) {
  switch (resultado) {
    case "A":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-positive">
          <CheckCircle className="h-3.5 w-3.5" />
          Aprobado
        </span>
      );
    case "STUB":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-t-secondary">
          <AlertTriangle className="h-3.5 w-3.5" />
          Stub (sin cert.)
        </span>
      );
    case "PENDIENTE":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
          <Clock className="h-3.5 w-3.5" />
          Pendiente
        </span>
      );
    case "R":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
          <XCircle className="h-3.5 w-3.5" />
          Rechazado
        </span>
      );
    default:
      return <span className="text-xs text-t-secondary">—</span>;
  }
}
