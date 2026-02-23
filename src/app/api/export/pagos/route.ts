import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events/operations";
import { prisma } from "@/lib/prisma";
import { toCSV, csvResponse } from "@/lib/export-utils";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission(
      OPERATIONS.system.config.update,
      "canView",
      ["ADMIN", "CONTADOR"]
    );
    if (error) return error;

    const estado = req.nextUrl.searchParams.get("estado");
    const desde = req.nextUrl.searchParams.get("desde");
    const hasta = req.nextUrl.searchParams.get("hasta");

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (desde || hasta) {
      const fechaFilter: Record<string, unknown> = {};
      if (desde) fechaFilter.gte = new Date(desde);
      if (hasta) fechaFilter.lte = new Date(hasta);
      where.fechaPago = fechaFilter;
    }

    const pagos = await prisma.pagoMercadoPago.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const data = pagos.map((p) => ({
      Monto: Number(p.monto),
      Fecha: p.fechaPago ?? p.createdAt,
      Estado: p.estado,
      "MP Status": p.mpStatus ?? "",
      "Referencia MP": p.mpPaymentId ?? "",
    }));

    const today = new Date().toISOString().slice(0, 10);
    const csv = toCSV(data);
    return csvResponse(csv, `pagos_${today}.csv`);
  } catch (error: unknown) {
    console.error("Error exporting pagos:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}
