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

    const empleados = await prisma.empleado.findMany({
      orderBy: { legajo: "asc" },
    });

    const data = empleados.map((e) => ({
      Legajo: e.legajo,
      Nombre: e.nombre,
      Apellido: e.apellido,
      DNI: e.dni,
      CUIL: e.cuil ?? "",
      Departamento: e.departamento,
      Cargo: e.cargo,
      "Sueldo Básico": Number(e.sueldoBasico),
      Estado: e.estado,
      "Fecha Ingreso": e.fechaIngreso,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const csv = toCSV(data);
    return csvResponse(csv, `empleados_${today}.csv`);
  } catch (error: unknown) {
    console.error("Error exporting empleados:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}
