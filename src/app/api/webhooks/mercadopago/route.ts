import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mpPreApproval } from "@/lib/mercadopago";
import { consultarPago } from "@/lib/mp-service";
import { eventBus, OPERATIONS } from "@/lib/events";
import { ensureInitialized } from "@/lib/init";
import { registrarMovimiento } from "@/lib/stock-utils";
import { generarFacturaAutomatica } from "@/lib/facturacion-service";
import type { EstadoPagoMP, TipoPagoMP } from "@prisma/client";

// Tipo local para el response de pago de MP (los campos que usamos)
interface MPPaymentData {
  external_reference?: string | null;
  status?: string | null;
  status_detail?: string | null;
  payment_method_id?: string | null;
  payment_type_id?: string | null;
  transaction_amount?: number | null;
  transaction_details?: { net_received_amount?: number | null } | null;
  fee_details?: Array<{ amount: number }> | null;
}

/**
 * Webhook de MercadoPago.
 * Recibe notificaciones de pagos y suscripciones.
 *
 * Tipos de notificación:
 * - payment: un pago cambió de estado
 * - subscription_preapproval: una suscripción cambió de estado
 * - subscription_authorized_payment: un pago de suscripción
 */
export async function POST(req: NextRequest) {
  ensureInitialized();
  try {
    const body = await req.json() as { type?: string; data?: { id?: string | number }; action?: string };
    const { type, data, action } = body;

    console.log(`[MP Webhook] type=${type}, action=${action}, data=`, JSON.stringify(data));

    if (type === "payment" && data?.id) {
      await procesarNotificacionPago(data.id.toString());
    }

    if (type === "subscription_preapproval" && data?.id) {
      await procesarNotificacionSuscripcion(data.id.toString());
    }

    if (type === "subscription_authorized_payment" && data?.id) {
      await procesarNotificacionPago(data.id.toString());
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[MP Webhook] Error:", error);
    // Siempre retornar 200 para que MP no reintente
    return NextResponse.json({ received: true, error: "Internal error" });
  }
}

// También aceptar GET (MP a veces valida el endpoint con GET)
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

/**
 * Procesa una notificación de pago.
 */
async function procesarNotificacionPago(mpPaymentId: string) {
  const rawPayment = await consultarPago(mpPaymentId);

  if (!rawPayment) {
    console.error(`[MP Webhook] Pago ${mpPaymentId} no encontrado en MP`);
    return;
  }

  // Castear a nuestro tipo local para acceder a los campos del SDK sin usar 'any'
  const payment = rawPayment as unknown as MPPaymentData;

  const externalRef = payment.external_reference ?? "";
  const mpStatus = payment.status ?? undefined;

  console.log(`[MP Webhook] Pago ${mpPaymentId}: status=${mpStatus}, ref=${externalRef}`);

  const estadoInterno = mapearEstadoMP(mpStatus ?? "");

  const feeTotal = Array.isArray(payment.fee_details)
    ? payment.fee_details.reduce((sum, f) => sum + f.amount, 0)
    : undefined;

  const pagoRegistro = await prisma.pagoMercadoPago.upsert({
    where: { mpPaymentId },
    update: {
      mpStatus: mpStatus ?? undefined,
      mpStatusDetail: payment.status_detail ?? undefined,
      mpPaymentMethodId: payment.payment_method_id ?? undefined,
      mpPaymentTypeId: payment.payment_type_id ?? undefined,
      estado: estadoInterno,
      montoNeto: payment.transaction_details?.net_received_amount ?? undefined,
      comisionMP: feeTotal ?? undefined,
      fechaPago: mpStatus === "approved" ? new Date() : undefined,
    },
    create: {
      mpPaymentId,
      tipo: identificarTipoPago(externalRef),
      monto: payment.transaction_amount ?? 0,
      mpStatus: mpStatus ?? undefined,
      mpStatusDetail: payment.status_detail ?? undefined,
      mpPaymentMethodId: payment.payment_method_id ?? undefined,
      mpPaymentTypeId: payment.payment_type_id ?? undefined,
      estado: estadoInterno,
      montoNeto: payment.transaction_details?.net_received_amount ?? undefined,
      comisionMP: feeTotal ?? undefined,
      fechaPago: mpStatus === "approved" ? new Date() : undefined,
      ...(externalRef.startsWith("solicitud:")
        ? { solicitudId: externalRef.replace("solicitud:", "") }
        : {}),
      ...(externalRef.startsWith("cuota:")
        ? {
            cuotaId: externalRef.split(":")[1],
            contratoId: externalRef.split(":")[3],
          }
        : {}),
      ...(externalRef.startsWith("contrato:")
        ? { contratoId: externalRef.replace("contrato:", "") }
        : {}),
      ...(externalRef.startsWith("pedido:")
        ? { ordenVentaId: externalRef.replace("pedido:", "") }
        : {}),
    },
  });

  if (mpStatus === "approved") {
    if (externalRef.startsWith("solicitud:")) {
      const solicitudId = externalRef.replace("solicitud:", "");
      await procesarPagoSolicitudAprobado(solicitudId, mpPaymentId);
    }
    if (externalRef.startsWith("cuota:")) {
      const cuotaId = externalRef.split(":")[1] ?? "";
      await procesarPagoCuotaAprobado(cuotaId, payment.transaction_amount ?? 0);
    }
    if (externalRef.startsWith("contrato:")) {
      const contratoId = externalRef.replace("contrato:", "");
      await procesarPagoRecurrenteAprobado(contratoId, payment.transaction_amount ?? 0, mpPaymentId);
    }
    if (externalRef.startsWith("pedido:")) {
      const ordenId = externalRef.replace("pedido:", "");
      await procesarPagoPedidoAprobado(ordenId, mpPaymentId);
    }

    // Emitir evento para handlers contables (asiento automático)
    await eventBus.emit(
      OPERATIONS.commercial.payment.approve,
      "PagoMercadoPago",
      pagoRegistro.id,
      { mpPaymentId, monto: payment.transaction_amount },
      "system"
    ).catch((err) => console.error("[MP Webhook] Error emitiendo evento contable:", err));
  }
}

/**
 * Cuando se confirma el pago del primer mes → solicitud pasa a PAGADA.
 */
async function procesarPagoSolicitudAprobado(solicitudId: string, mpPaymentId: string) {
  const solicitud = await prisma.solicitud.findUnique({ where: { id: solicitudId } });
  if (!solicitud) return;
  if (solicitud.estado !== "PAGO_PENDIENTE") return;

  await prisma.solicitud.update({
    where: { id: solicitudId },
    data: {
      estado: "PAGADA",
      mpPaymentId,
      fechaPago: new Date(),
    },
  });

  await prisma.businessEvent.create({
    data: {
      operationId: OPERATIONS.solicitud.pay,
      entityType: "Solicitud",
      entityId: solicitudId,
      userId: "system",
      payload: { mpPaymentId },
    },
  });

  console.log(`[MP Webhook] Solicitud ${solicitudId} → PAGADA`);

  // Generar factura automática para el primer mes
  try {
    const pago = await prisma.pagoMercadoPago.findUnique({ where: { mpPaymentId } });
    if (pago) {
      const solicitudData = await prisma.solicitud.findUnique({
        where: { id: solicitudId },
        include: { cliente: true },
      });
      if (solicitudData) {
        await generarFacturaAutomatica({
          pagoMPId: pago.id,
          solicitudId,
          clienteId: solicitudData.clienteId,
          monto: Number(solicitudData.montoPrimerMes),
          concepto: `Alquiler ${solicitudData.marcaDeseada} ${solicitudData.modeloDeseado} — Primer mes adelantado (Plan ${solicitudData.plan.replace("MESES_", "")} meses)`,
        });
      }
    }
  } catch (factError) {
    console.error("[Webhook] Error generando factura primer mes:", factError);
  }
}

/**
 * Cuando se confirma el pago de una cuota individual → marca cuota PAGADA.
 */
async function procesarPagoCuotaAprobado(cuotaId: string, monto: number) {
  const cuota = await prisma.cuota.findUnique({ where: { id: cuotaId } });
  if (!cuota) return;
  if (cuota.estado === "PAGADA") return;

  await prisma.cuota.update({
    where: { id: cuotaId },
    data: {
      estado: "PAGADA",
      fechaPago: new Date(),
      montoPagado: monto,
    },
  });

  console.log(`[MP Webhook] Cuota ${cuotaId} → PAGADA ($${monto})`);

  // Generar factura automática para la cuota individual
  try {
    const pago = await prisma.pagoMercadoPago.findFirst({ where: { cuotaId } });
    const cuotaData = await prisma.cuota.findUnique({
      where: { id: cuotaId },
      include: { contrato: { include: { moto: true } } },
    });
    if (pago && cuotaData) {
      await generarFacturaAutomatica({
        pagoMPId: pago.id,
        contratoId: cuotaData.contratoId,
        cuotaId,
        clienteId: cuotaData.contrato.clienteId,
        monto,
        concepto: `Alquiler ${cuotaData.contrato.moto.marca} ${cuotaData.contrato.moto.modelo} — Cuota ${cuotaData.numero}`,
        periodoDesde: cuotaData.fechaVencimiento,
      });
    }
  } catch (factError) {
    console.error("[Webhook] Error generando factura cuota:", factError);
  }

  // Wizard flow: first cuota paid → moto RESERVADA → ALQUILADA
  if (cuota.numero === 1) {
    try {
      const contrato = await prisma.contrato.findUnique({
        where: { id: cuota.contratoId },
        include: { moto: true },
      });
      if (contrato?.moto?.estado === "RESERVADA") {
        await prisma.moto.update({
          where: { id: contrato.motoId },
          data: { estado: "ALQUILADA", estadoAnterior: "RESERVADA" },
        });
        await prisma.historialEstadoMoto.create({
          data: {
            motoId: contrato.motoId,
            estadoAnterior: "RESERVADA",
            estadoNuevo: "ALQUILADA",
            motivo: `Primer pago confirmado via wizard — cuota ${cuotaId}`,
            userId: "system",
          },
        });

        // Update solicitud → ENTREGADA
        const solicitud = await prisma.solicitud.findFirst({
          where: { contratoId: contrato.id },
        });
        if (solicitud && solicitud.estado === "APROBADA") {
          await prisma.solicitud.update({
            where: { id: solicitud.id },
            data: { estado: "ENTREGADA", fechaEntrega: new Date() },
          });
        }

        console.log(`[MP Webhook] Moto ${contrato.motoId} → ALQUILADA (wizard first payment)`);
      }
    } catch (motoError) {
      console.error("[Webhook] Error transitioning moto:", motoError);
    }
  }
}

/**
 * Cuando se confirma un pago recurrente → buscar y marcar cuota pendiente.
 */
async function procesarPagoRecurrenteAprobado(
  contratoId: string,
  monto: number,
  mpPaymentId: string
) {
  const cuota = await prisma.cuota.findFirst({
    where: {
      contratoId,
      estado: { in: ["PENDIENTE", "VENCIDA"] },
    },
    orderBy: { fechaVencimiento: "asc" },
  });

  if (!cuota) {
    console.warn(
      `[MP Webhook] Pago recurrente para contrato ${contratoId} pero no hay cuotas pendientes`
    );
    return;
  }

  await prisma.cuota.update({
    where: { id: cuota.id },
    data: {
      estado: "PAGADA",
      fechaPago: new Date(),
      montoPagado: monto,
    },
  });

  await prisma.pagoMercadoPago.updateMany({
    where: { mpPaymentId },
    data: { cuotaId: cuota.id },
  });

  console.log(
    `[MP Webhook] Cuota ${cuota.numero} del contrato ${contratoId} → PAGADA (recurrente)`
  );

  // Generar factura automática para el pago recurrente
  try {
    const pagoReg = await prisma.pagoMercadoPago.findFirst({ where: { mpPaymentId } });
    if (pagoReg) {
      const contratoData = await prisma.contrato.findUnique({
        where: { id: contratoId },
        include: { moto: true },
      });
      if (contratoData) {
        await generarFacturaAutomatica({
          pagoMPId: pagoReg.id,
          contratoId,
          cuotaId: cuota.id,
          clienteId: contratoData.clienteId,
          monto,
          concepto: `Alquiler ${contratoData.moto.marca} ${contratoData.moto.modelo} — Cuota ${cuota.numero}`,
          periodoDesde: cuota.fechaVencimiento,
        });
      }
    }
  } catch (factError) {
    console.error("[Webhook] Error generando factura recurrente:", factError);
  }

  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    include: { cuotas: true },
  });

  if (contrato?.esLeaseToOwn) {
    const pendientes = contrato.cuotas.filter(
      (c) => c.estado === "PENDIENTE" || c.estado === "VENCIDA"
    );
    if (pendientes.length === 0) {
      const { procesarLeaseToOwn } = await import("@/lib/lease-to-own");
      await procesarLeaseToOwn("system");
      console.log(`[MP Webhook] Lease-to-own triggered para contrato ${contratoId}`);
    }
  }
}

/**
 * Procesa notificación de cambio de estado de suscripción.
 */
async function procesarNotificacionSuscripcion(preapprovalId: string) {
  const suscripcion = await prisma.suscripcionMP.findUnique({
    where: { mpPreapprovalId: preapprovalId },
  });

  if (!suscripcion) {
    console.warn(`[MP Webhook] Suscripción ${preapprovalId} no encontrada en DB`);
    return;
  }

  try {
    const preapproval = await mpPreApproval.get({ id: preapprovalId });
    await prisma.suscripcionMP.update({
      where: { mpPreapprovalId: preapprovalId },
      data: { mpStatus: preapproval.status ?? "unknown" },
    });
    console.log(`[MP Webhook] Suscripción ${preapprovalId} → ${preapproval.status}`);
  } catch (error) {
    console.error(`[MP Webhook] Error consultando suscripción:`, error);
  }
}

/**
 * Cuando se confirma el pago de un pedido de repuestos → marca orden PAGADA y descuenta stock.
 */
async function procesarPagoPedidoAprobado(ordenId: string, mpPaymentId: string) {
  const orden = await prisma.ordenVentaRepuesto.findUnique({
    where: { id: ordenId },
    include: { items: true },
  });
  if (!orden) return;
  if (orden.estado !== "PENDIENTE_PAGO") return;

  // Update order status
  await prisma.ordenVentaRepuesto.update({
    where: { id: ordenId },
    data: {
      estado: "PAGADA",
      mpPaymentId,
    },
  });

  // Deduct stock for each item
  for (const item of orden.items) {
    await registrarMovimiento({
      repuestoId: item.repuestoId,
      tipo: "EGRESO",
      cantidad: item.cantidad,
      descripcion: `Venta online — Orden #${orden.numero}`,
      costoUnitario: Number(item.precioUnitario),
      referenciaTipo: "OrdenVentaRepuesto",
      referenciaId: ordenId,
      userId: "system",
    });
  }

  // Emit sale.confirm event for accounting handler
  await eventBus.emit(
    OPERATIONS.sale.confirm,
    "OrdenVentaRepuesto",
    ordenId,
    { mpPaymentId, total: Number(orden.total) },
    "system"
  ).catch((err) => console.error("[MP Webhook] Error emitiendo evento venta:", err));

  console.log(`[MP Webhook] Pedido ${ordenId} (Orden #${orden.numero}) → PAGADA, stock descontado`);
}

// ── Helpers ──

function mapearEstadoMP(mpStatus: string): EstadoPagoMP {
  const map: Record<string, EstadoPagoMP> = {
    approved: "APROBADO",
    rejected: "RECHAZADO",
    pending: "PENDIENTE",
    in_process: "EN_PROCESO",
    cancelled: "CANCELADO",
    refunded: "REEMBOLSADO",
    charged_back: "REEMBOLSADO",
  };
  return map[mpStatus] ?? "PENDIENTE";
}

function identificarTipoPago(externalRef: string): TipoPagoMP {
  if (externalRef.startsWith("solicitud:")) return "PRIMER_MES";
  if (externalRef.startsWith("cuota:")) return "CUOTA_INDIVIDUAL";
  if (externalRef.startsWith("contrato:")) return "CUOTA_RECURRENTE";
  if (externalRef.startsWith("pedido:")) return "PEDIDO_REPUESTOS";
  return "CUOTA_INDIVIDUAL";
}
