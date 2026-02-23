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

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;

    const contratos = await prisma.contrato.findMany({
      where,
      include: {
        cliente: { select: { nombre: true, apellido: true, dni: true } },
        moto: { select: { patente: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = contratos.map((c) => ({
      Cliente: c.cliente.nombre + " " + c.cliente.apellido,
      "DNI Cliente": c.cliente.dni,
      "Moto (Patente)": c.moto?.patente ?? "",
      "Monto Cuota": Number(c.montoPeriodo),
      Frecuencia: c.frecuenciaPago,
      Estado: c.estado,
      "Fecha Inicio": c.fechaInicio,
      "Fecha Fin": c.fechaFin,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const csv = toCSV(data);
    return csvResponse(csv, `contratos_${today}.csv`);
  } catch (error: unknown) {
    console.error("Error exporting contratos:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}
