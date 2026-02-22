import { NextResponse } from "next/server";
import { obtenerTipoCambio } from "@/lib/tipo-cambio";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cotizacion = await obtenerTipoCambio();
    return NextResponse.json(cotizacion);
  } catch {
    return NextResponse.json({ error: "Tipo de cambio no disponible" }, { status: 503 });
  }
}

// Forzar actualización (ignora cache)
export async function POST() {
  try {
    // Borrar cache para forzar re-fetch
    await prisma.tipoCambioCache.deleteMany({ where: { moneda: "USD" } });
    const cotizacion = await obtenerTipoCambio();
    return NextResponse.json(cotizacion);
  } catch {
    return NextResponse.json({ error: "Error al actualizar tipo de cambio" }, { status: 500 });
  }
}
