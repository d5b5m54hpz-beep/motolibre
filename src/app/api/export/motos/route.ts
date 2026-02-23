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
    const marca = req.nextUrl.searchParams.get("marca");

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (marca) where.marca = marca;

    const motos = await prisma.moto.findMany({
      where,
      orderBy: { patente: "asc" },
    });

    const data = motos.map((m) => ({
      Patente: m.patente ?? "",
      Marca: m.marca,
      Modelo: m.modelo,
      Año: m.anio,
      Km: m.km,
      Estado: m.estado,
      Cilindrada: m.cilindrada ?? "",
      Color: m.color ?? "",
      Tipo: m.tipo,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const csv = toCSV(data);
    return csvResponse(csv, `motos_${today}.csv`);
  } catch (error: unknown) {
    console.error("Error exporting motos:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}
