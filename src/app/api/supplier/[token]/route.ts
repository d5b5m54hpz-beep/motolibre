import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const portalToken = await prisma.portalProveedorToken.findUnique({
    where: { token },
  });

  if (!portalToken) {
    return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  }
  if (!portalToken.activo) {
    return NextResponse.json({ error: "Token desactivado" }, { status: 403 });
  }
  if (portalToken.expiraAt < new Date()) {
    return NextResponse.json({ error: "Token expirado" }, { status: 403 });
  }

  const embarque = await prisma.embarqueImportacion.findUnique({
    where: { id: portalToken.embarqueId },
    select: {
      numero: true,
      estado: true,
      proveedorNombre: true,
      puertoOrigen: true,
      puertoDestino: true,
      naviera: true,
      numeroContenedor: true,
      tipoTransporte: true,
      fechaEmbarque: true,
      fechaEstimadaArribo: true,
      fechaArriboPuerto: true,
      fechaDespacho: true,
      fechaRecepcion: true,
      items: {
        select: {
          descripcion: true,
          codigoProveedor: true,
          cantidad: true,
          cantidadRecibida: true,
          esMoto: true,
        },
      },
    },
  });

  if (!embarque) {
    return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
  }

  return NextResponse.json(embarque);
}
