import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { obtenerUltimoComprobante, isAfipConfigured } from "@/lib/services/afip-service";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.invoicing.invoice.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  if (!isAfipConfigured()) {
    return NextResponse.json({
      data: { mensaje: "AFIP no configurado — modo stub activo", ultimoComprobante: null },
    });
  }

  const sp = req.nextUrl.searchParams;
  const puntoVenta = Number(sp.get("puntoVenta") || "1");
  const tipo = Number(sp.get("tipo") || "1");

  if (!puntoVenta || !tipo) {
    return NextResponse.json(
      { error: "Se requieren puntoVenta y tipo como query params" },
      { status: 400 }
    );
  }

  try {
    const ultimo = await obtenerUltimoComprobante(puntoVenta, tipo);
    return NextResponse.json({ data: { puntoVenta, tipo, ultimoComprobante: ultimo } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
