import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { generarPDFConvenio } from "@/lib/convenio-pdf";

/**
 * GET /api/solicitudes-taller/[id]/convenio-pdf
 * Genera y retorna el PDF del convenio.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { id } = await params;

  const solicitud = await prisma.solicitudTaller.findUnique({
    where: { id },
    include: { convenio: true },
  });

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  if (!solicitud.convenio) {
    return NextResponse.json(
      { error: "No hay convenio generado para esta solicitud" },
      { status: 404 }
    );
  }

  const convenio = solicitud.convenio;

  const pdfBuffer = await generarPDFConvenio({
    nombreTaller: solicitud.nombreTaller,
    razonSocial: solicitud.razonSocial,
    cuit: solicitud.cuit,
    direccion: solicitud.direccion,
    ciudad: solicitud.ciudad,
    provincia: solicitud.provincia,
    contactoNombre: solicitud.contactoNombre,
    email: solicitud.email,
    telefono: solicitud.telefono,
    tarifaHoraBase: Number(convenio.tarifaHoraBase),
    margenRepuestos: convenio.margenRepuestos
      ? Number(convenio.margenRepuestos)
      : null,
    plazoFacturaDias: convenio.plazoFacturaDias,
    fechaInicio: convenio.fechaInicio.toISOString(),
    fechaFin: convenio.fechaFin?.toISOString() ?? null,
    zonaCobertura: convenio.zonaCobertura,
    otMaxMes: convenio.otMaxMes,
    convenioId: convenio.id,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="convenio-${solicitud.nombreTaller.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
