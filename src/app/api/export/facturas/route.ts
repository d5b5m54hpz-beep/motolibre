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

    const tipo = req.nextUrl.searchParams.get("tipo");
    const desde = req.nextUrl.searchParams.get("desde");

    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;
    if (desde) where.createdAt = { gte: new Date(desde) };

    const facturas = await prisma.factura.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const data = facturas.map((f) => ({
      Número: f.numeroCompleto,
      Tipo: f.tipo,
      Receptor: f.receptorNombre,
      CUIT: f.receptorCuit ?? "",
      Fecha: f.createdAt,
      Neto: Number(f.montoNeto),
      IVA: Number(f.montoIva),
      Total: Number(f.montoTotal),
      Estado: f.estado,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const csv = toCSV(data);
    return csvResponse(csv, `facturas_${today}.csv`);
  } catch (error: unknown) {
    console.error("Error exporting facturas:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}
