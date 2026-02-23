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

    const clientes = await prisma.cliente.findMany({
      orderBy: { createdAt: "desc" },
    });

    const data = clientes.map((c) => ({
      Nombre: c.nombre,
      Apellido: c.apellido,
      DNI: c.dni,
      Email: c.email,
      Teléfono: c.telefono,
      Estado: c.estado,
      Scoring: c.score ?? "",
      "Fecha Alta": c.createdAt,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const csv = toCSV(data);
    return csvResponse(csv, `clientes_${today}.csv`);
  } catch (error: unknown) {
    console.error("Error exporting clientes:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}
