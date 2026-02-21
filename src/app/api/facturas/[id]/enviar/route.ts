import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { generarPDFFactura } from "@/lib/factura-pdf";
import { enviarFacturaEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.invoicing.invoice.sendEmail,
    "canExecute",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { email?: string };
  const emailOverride = body.email;

  const factura = await prisma.factura.findUnique({ where: { id } });
  if (!factura) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: factura.clienteId },
    select: { email: true, nombre: true },
  });

  const emailDestino = emailOverride ?? cliente?.email;
  if (!emailDestino) {
    return NextResponse.json({ error: "No hay email de destino" }, { status: 422 });
  }

  const pdfBuffer = await generarPDFFactura(factura);

  await enviarFacturaEmail({
    to: emailDestino,
    clienteNombre: cliente?.nombre ?? factura.receptorNombre,
    facturaNumero: factura.numeroCompleto,
    facturaTipo: `Factura ${factura.tipo}`,
    montoTotal: Number(factura.montoTotal),
    pdfBuffer,
  });

  await prisma.factura.update({
    where: { id },
    data: {
      estado: "ENVIADA",
      emailEnviado: true,
      emailEnviadoAt: new Date(),
    },
  });

  return NextResponse.json({ data: { enviado: true, email: emailDestino } });
}
