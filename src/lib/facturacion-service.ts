import { prisma } from "@/lib/prisma";
import {
  determinarTipoFactura,
  calcularMontosFactura,
  proximoNumeroFactura,
  obtenerCAEFactura,
  datosEmisor,
  CONDICION_IVA_TEXTO,
} from "@/lib/facturacion-utils";
import { generarPDFFactura } from "@/lib/factura-pdf";
import { enviarFacturaEmail } from "@/lib/email";
import { eventBus, OPERATIONS } from "@/lib/events";

/**
 * Genera factura automáticamente para un pago aprobado.
 * Se llama desde el webhook de MP después de confirmar el pago.
 */
export async function generarFacturaAutomatica(params: {
  pagoMPId: string;
  solicitudId?: string;
  contratoId?: string;
  cuotaId?: string;
  clienteId: string;
  monto: number;
  concepto: string;
  periodoDesde?: Date;
  periodoHasta?: Date;
}) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
  });
  if (!cliente) throw new Error(`Cliente ${params.clienteId} no encontrado`);

  const tipo = determinarTipoFactura(cliente.condicionIva);
  const montos = calcularMontosFactura(params.monto, tipo);
  const emisor = datosEmisor();
  const { numero, numeroCompleto } = await proximoNumeroFactura(tipo, emisor.puntoVenta);

  // Solicitar CAE a AFIP (real o stub según config)
  const documentoReceptor = cliente.cuit ?? cliente.dni ?? "0";
  const afipResult = await obtenerCAEFactura({
    tipo,
    puntoVenta: emisor.puntoVenta,
    importeNeto: montos.montoNeto,
    importeIVA: montos.montoIva,
    importeTotal: montos.montoTotal,
    condicionIVAReceptor: cliente.condicionIva,
    documentoReceptor,
    periodoDesde: params.periodoDesde,
    periodoHasta: params.periodoHasta,
  });

  // Si AFIP rechazó, logueamos pero no bloqueamos (queda PENDIENTE)
  if (afipResult.afipResultado === "R") {
    console.error(`[Facturación] AFIP rechazó factura: ${afipResult.afipObservaciones}`);
  }

  // Construir domicilio del receptor desde campos separados
  const domicilioParts = [
    cliente.calle,
    cliente.numero,
    cliente.piso ? `Piso ${cliente.piso}` : null,
    cliente.depto ? `Depto ${cliente.depto}` : null,
    cliente.localidad,
    cliente.provincia,
  ].filter(Boolean);
  const receptorDomicilio = domicilioParts.length > 0 ? domicilioParts.join(", ") : null;

  const factura = await prisma.factura.create({
    data: {
      tipo,
      puntoVenta: emisor.puntoVenta,
      numero,
      numeroCompleto,
      emisorRazonSocial: emisor.razonSocial,
      emisorCuit: emisor.cuit,
      emisorCondicionIva: emisor.condicionIva,
      emisorDomicilio: emisor.domicilio,
      receptorNombre: `${cliente.nombre} ${cliente.apellido}`,
      receptorCuit: cliente.cuit ?? cliente.dni,
      receptorCondicionIva: CONDICION_IVA_TEXTO[cliente.condicionIva] ?? cliente.condicionIva,
      receptorDomicilio,
      montoNeto: montos.montoNeto,
      montoIva: montos.montoIva,
      montoTotal: montos.montoTotal,
      cae: afipResult.cae || null,
      caeVencimiento: afipResult.caeVencimiento,
      afipResultado: afipResult.afipResultado,
      afipObservaciones: afipResult.afipObservaciones,
      concepto: params.concepto,
      periodoDesde: params.periodoDesde,
      periodoHasta: params.periodoHasta,
      clienteId: params.clienteId,
      contratoId: params.contratoId,
      pagoMPId: params.pagoMPId,
      cuotaId: params.cuotaId,
    },
  });

  // Emitir evento para asiento contable de factura
  await eventBus.emit(
    OPERATIONS.invoicing.invoice.create,
    "Factura",
    factura.id,
    { tipo: factura.tipo, montoTotal: Number(factura.montoTotal) },
    "system"
  ).catch((err) => console.error("[Facturación] Error emitiendo evento contable:", err));

  // Generar PDF y enviar email (no bloqueante — errores no abortan la factura)
  try {
    const pdfBuffer = await generarPDFFactura(factura);

    if (cliente.email) {
      try {
        await enviarFacturaEmail({
          to: cliente.email,
          clienteNombre: cliente.nombre,
          facturaNumero: numeroCompleto,
          facturaTipo: `Factura ${tipo}`,
          montoTotal: montos.montoTotal,
          pdfBuffer,
        });

        await prisma.factura.update({
          where: { id: factura.id },
          data: {
            estado: "ENVIADA",
            emailEnviado: true,
            emailEnviadoAt: new Date(),
          },
        });

        console.log(`[Facturación] Factura ${numeroCompleto} enviada a ${cliente.email}`);
      } catch (emailError) {
        console.error("[Facturación] Error enviando email:", emailError);
      }
    }
  } catch (pdfError) {
    console.error("[Facturación] Error generando PDF:", pdfError);
  }

  return factura;
}
