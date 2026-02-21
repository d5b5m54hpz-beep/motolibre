import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mpPreApproval } from "@/lib/mercadopago";
import { consultarPago } from "@/lib/mp-service";
import { OPERATIONS } from "@/lib/events";
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

  await prisma.pagoMercadoPago.upsert({
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
  return "CUOTA_INDIVIDUAL";
}
