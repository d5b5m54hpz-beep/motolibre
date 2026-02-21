import { mpPreference, mpPreApproval, mpPayment, mpPaymentRefund } from "@/lib/mercadopago";
import type { FrecuenciaPago } from "@prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Genera un link de pago (Checkout Pro) para el primer mes adelantado.
 */
export async function crearPreferenciaPrimerMes(params: {
  solicitudId: string;
  clienteNombre: string;
  clienteApellido: string;
  clienteEmail: string;
  motoModelo: string;
  plan: string;
  monto: number;
}) {
  const preference = await mpPreference.create({
    body: {
      items: [
        {
          id: params.solicitudId,
          title: `MotoLibre — Primer mes alquiler ${params.motoModelo} (Plan ${params.plan.replace("MESES_", "")} meses)`,
          quantity: 1,
          unit_price: params.monto,
          currency_id: "ARS",
        },
      ],
      payer: {
        name: params.clienteNombre,
        surname: params.clienteApellido,
        email: params.clienteEmail,
      },
      external_reference: `solicitud:${params.solicitudId}`,
      notification_url: `${APP_URL}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${APP_URL}/solicitud/${params.solicitudId}/pago-exitoso`,
        failure: `${APP_URL}/solicitud/${params.solicitudId}/pago-fallido`,
        pending: `${APP_URL}/solicitud/${params.solicitudId}/pago-pendiente`,
      },
      auto_return: "approved",
      statement_descriptor: "MOTOLIBRE",
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    },
  });

  return {
    preferenceId: preference.id!,
    initPoint: preference.init_point!,
    sandboxInitPoint: preference.sandbox_init_point!,
  };
}

/**
 * Crea una suscripción recurrente (PreApproval) para los cobros automáticos.
 * Se llama al registrar la entrega de la moto.
 */
export async function crearSuscripcionRecurrente(params: {
  contratoId: string;
  clienteEmail: string;
  motoModelo: string;
  monto: number;
  frecuencia: FrecuenciaPago;
  duracionMeses: number;
  fechaInicio: Date;
}) {
  const mpFrecuencia =
    params.frecuencia === "SEMANAL"
      ? { frequency: 7, frequency_type: "days" as const }
      : { frequency: 1, frequency_type: "months" as const };

  const fechaFin = new Date(params.fechaInicio);
  fechaFin.setMonth(fechaFin.getMonth() + params.duracionMeses);

  const preapproval = await mpPreApproval.create({
    body: {
      payer_email: params.clienteEmail,
      reason: `MotoLibre — Alquiler ${params.motoModelo} (Contrato ${params.contratoId})`,
      external_reference: `contrato:${params.contratoId}`,
      auto_recurring: {
        frequency: mpFrecuencia.frequency,
        frequency_type: mpFrecuencia.frequency_type,
        transaction_amount: params.monto,
        currency_id: "ARS",
        start_date: params.fechaInicio.toISOString(),
        end_date: fechaFin.toISOString(),
      },
      back_url: `${APP_URL}/contrato/${params.contratoId}`,
      status: "pending",
    },
  });

  return {
    preapprovalId: preapproval.id!,
    initPoint: preapproval.init_point!,
    status: preapproval.status!,
  };
}

/**
 * Genera un link de pago individual para una cuota específica.
 * Se usa cuando el cobro automático falla.
 */
export async function crearPreferenciaCuota(params: {
  cuotaId: string;
  contratoId: string;
  numeroCuota: number;
  clienteEmail: string;
  motoModelo: string;
  monto: number;
}) {
  const preference = await mpPreference.create({
    body: {
      items: [
        {
          id: params.cuotaId,
          title: `MotoLibre — Cuota ${params.numeroCuota} alquiler ${params.motoModelo}`,
          quantity: 1,
          unit_price: params.monto,
          currency_id: "ARS",
        },
      ],
      payer: {
        email: params.clienteEmail,
      },
      external_reference: `cuota:${params.cuotaId}:contrato:${params.contratoId}`,
      notification_url: `${APP_URL}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${APP_URL}/pago-exitoso`,
        failure: `${APP_URL}/pago-fallido`,
        pending: `${APP_URL}/pago-pendiente`,
      },
      auto_return: "approved",
      statement_descriptor: "MOTOLIBRE",
    },
  });

  return {
    preferenceId: preference.id!,
    initPoint: preference.init_point!,
    sandboxInitPoint: preference.sandbox_init_point!,
  };
}

/**
 * Refund completo de un pago.
 * Se usa cuando se rechaza una solicitud.
 */
export async function refundPago(paymentId: string | number) {
  const id = typeof paymentId === "string" ? parseInt(paymentId) : paymentId;
  return mpPaymentRefund.create({ payment_id: id, body: {} });
}

/**
 * Consulta el estado de un pago.
 */
export async function consultarPago(paymentId: string | number) {
  return mpPayment.get({
    id: typeof paymentId === "string" ? parseInt(paymentId) : paymentId,
  });
}

/**
 * Pausa una suscripción (PreApproval).
 */
export async function pausarSuscripcion(preapprovalId: string) {
  return mpPreApproval.update({
    id: preapprovalId,
    body: { status: "paused" },
  });
}

/**
 * Cancela una suscripción (PreApproval).
 */
export async function cancelarSuscripcion(preapprovalId: string) {
  return mpPreApproval.update({
    id: preapprovalId,
    body: { status: "cancelled" },
  });
}
