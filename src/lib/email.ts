import { Resend } from "resend";
import { render } from "@react-email/components";
import RecordatorioPagoEmail, {
  type RecordatorioPagoEmailProps,
} from "../../emails/recordatorio-pago";
import CuotaVencidaEmail, {
  type CuotaVencidaEmailProps,
} from "../../emails/cuota-vencida";
import BienvenidaTallerEmail, {
  type BienvenidaTallerEmailProps,
} from "../../emails/bienvenida-taller";
import * as React from "react";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? "facturacion@motolibre.com.ar";

/**
 * Envía factura por email con PDF adjunto.
 */
export async function enviarFacturaEmail(params: {
  to: string;
  clienteNombre: string;
  facturaNumero: string;
  facturaTipo: string;
  montoTotal: number;
  pdfBuffer: Buffer;
}) {
  const { data, error } = await getResend().emails.send({
    from: `MotoLibre Facturación <${FROM}>`,
    to: params.to,
    subject: `MotoLibre — Factura ${params.facturaTipo} ${params.facturaNumero}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #23e0ff;">MotoLibre</h2>
        <p>Hola ${params.clienteNombre},</p>
        <p>Te adjuntamos la factura <strong>${params.facturaTipo} ${params.facturaNumero}</strong> por un total de <strong>$${params.montoTotal.toLocaleString("es-AR")}</strong>.</p>
        <p>Encontrarás el comprobante adjunto en formato PDF.</p>
        <br>
        <p style="color: #666; font-size: 12px;">Este es un mensaje automático de MotoLibre S.A. — CUIT 30-71617222-4</p>
      </div>
    `,
    attachments: [
      {
        filename: `factura-${params.facturaNumero}.pdf`,
        content: params.pdfBuffer,
      },
    ],
  });

  if (error) {
    console.error("[Email] Error enviando factura:", error);
    throw new Error(`Error enviando email: ${error.message}`);
  }

  return data;
}

/**
 * Envía notificación genérica (fallback para emails sin template React).
 */
export async function enviarNotificacionEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const { data, error } = await getResend().emails.send({
    from: `MotoLibre <${FROM}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.error("[Email] Error:", error);
    throw new Error(`Error enviando email: ${error.message}`);
  }

  return data;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://motolibre.com.ar";

/**
 * Envía recordatorio de pago con template React Email.
 */
export async function enviarRecordatorioPago(
  params: RecordatorioPagoEmailProps & { to: string }
) {
  const { to, ...templateProps } = params;
  const props = { linkPago: `${APP_URL}/mi-cuenta/pagos`, ...templateProps };
  const html = await render(React.createElement(RecordatorioPagoEmail, props));

  const subject = props.diasVencida
    ? `Cuota #${props.cuotaNumero} vencida — $${props.monto.toLocaleString("es-AR")}`
    : `Recordatorio: tu cuota #${props.cuotaNumero} vence pronto`;

  const { data, error } = await getResend().emails.send({
    from: `MotoLibre Cobranzas <${FROM}>`,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[Email] Error enviando recordatorio:", error);
    throw new Error(`Error enviando email: ${error.message}`);
  }

  return data;
}

/**
 * Envía email de cuota vencida con mensaje personalizado por IA.
 */
export async function enviarCuotaVencida(
  params: CuotaVencidaEmailProps & { to: string }
) {
  const { to, ...templateProps } = params;
  const props = { linkPago: `${APP_URL}/mi-cuenta/pagos`, ...templateProps };
  const html = await render(React.createElement(CuotaVencidaEmail, props));

  const { data, error } = await getResend().emails.send({
    from: `MotoLibre Cobranzas <${FROM}>`,
    to,
    subject: `Acción requerida: cuota vencida en tu contrato ${params.contratoNumero}`,
    html,
  });

  if (error) {
    console.error("[Email] Error enviando cuota vencida:", error);
    throw new Error(`Error enviando email: ${error.message}`);
  }

  return data;
}

/**
 * Envía email de bienvenida al taller con credenciales del portal.
 */
export async function enviarBienvenidaTaller(
  params: BienvenidaTallerEmailProps & { to: string }
) {
  const { to, ...templateProps } = params;
  const html = await render(React.createElement(BienvenidaTallerEmail, templateProps));

  const { data, error } = await getResend().emails.send({
    from: `MotoLibre Red de Talleres <${FROM}>`,
    to,
    subject: `¡Bienvenido a la Red de Talleres MotoLibre! — Tus credenciales de acceso`,
    html,
  });

  if (error) {
    console.error("[Email] Error enviando bienvenida taller:", error);
    throw new Error(`Error enviando email: ${error.message}`);
  }

  return data;
}
