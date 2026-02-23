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

    const repuestos = await prisma.repuesto.findMany({
      orderBy: { codigo: "asc" },
      include: {
        ubicacion: { select: { nombre: true } },
      },
    });

    const data = repuestos.map((r) => ({
      Código: r.codigo,
      Nombre: r.nombre,
      Categoría: r.categoria,
      Marca: r.marca ?? "",
      Stock: r.stock,
      "Stock Mínimo": r.stockMinimo,
      "Precio Compra": Number(r.precioCompra),
      "Precio Venta": r.precioVenta ? Number(r.precioVenta) : "",
      Ubicación: r.ubicacion?.nombre ?? "",
    }));

    const today = new Date().toISOString().slice(0, 10);
    const csv = toCSV(data);
    return csvResponse(csv, `repuestos_${today}.csv`);
  } catch (error: unknown) {
    console.error("Error exporting repuestos:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}
