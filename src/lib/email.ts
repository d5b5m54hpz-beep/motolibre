import { Resend } from "resend";

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
 * Envía notificación genérica.
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
