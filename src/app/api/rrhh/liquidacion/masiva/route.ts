import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { calcularLiquidacion, proximoNumeroRecibo } from "@/lib/rrhh-utils";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const masivaSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/),
  tipo: z
    .enum(["MENSUAL", "AGUINALDO", "VACACIONES", "LIQUIDACION_FINAL"])
    .default("MENSUAL"),
});

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.hr.payroll.liquidate,
    "canExecute",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = masivaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { periodo, tipo } = parsed.data;

  const empleadosActivos = await prisma.empleado.findMany({
    where: { estado: "ACTIVO" },
    orderBy: { legajo: "asc" },
  });

  const resultados: Array<{
    legajo: string;
    nombre: string;
    numero: string;
    netoAPagar: number;
    status: "ok" | "skip" | "error";
    message?: string;
  }> = [];

  const { eventBus } = await import("@/lib/events/event-bus");

  for (const emp of empleadosActivos) {
    // Skip if already liquidated
    const existing = await prisma.reciboSueldo.findUnique({
      where: {
        empleadoId_tipo_periodo: {
          empleadoId: emp.id,
          tipo,
          periodo,
        },
      },
    });

    if (existing) {
      resultados.push({
        legajo: emp.legajo,
        nombre: `${emp.apellido}, ${emp.nombre}`,
        numero: existing.numero,
        netoAPagar: Number(existing.netoAPagar),
        status: "skip",
        message: "Ya liquidado",
      });
      continue;
    }

    try {
      const calc = await calcularLiquidacion({
        empleadoId: emp.id,
        periodo,
        tipo,
      });

      const numero = await proximoNumeroRecibo();

      const recibo = await prisma.reciboSueldo.create({
        data: {
          numero,
          empleadoId: emp.id,
          tipo,
          estado: "LIQUIDADO",
          periodo,
          sueldoBasico: calc.sueldoBasico,
          presentismo: calc.presentismo,
          antiguedad: calc.antiguedad,
          horasExtra: calc.horasExtra,
          otrosHaberes: calc.otrosHaberes,
          totalHaberes: calc.totalHaberes,
          jubilacion: calc.jubilacion,
          obraSocial: calc.obraSocial,
          ley19032: calc.ley19032,
          sindicato: calc.sindicato,
          impuestoGanancias: calc.impuestoGanancias,
          otrasDeduccion: calc.otrasDeduccion,
          totalDeducciones: calc.totalDeducciones,
          netoAPagar: calc.netoAPagar,
          contribJubilacion: calc.contribJubilacion,
          contribObraSocial: calc.contribObraSocial,
          contribLey19032: calc.contribLey19032,
          contribART: calc.contribART,
          totalContribuciones: calc.totalContribuciones,
          costoTotalEmpleador: calc.costoTotalEmpleador,
          fechaLiquidacion: new Date(),
          userId: session?.user?.id,
        },
      });

      await eventBus.emit(
        OPERATIONS.hr.payroll.liquidate,
        "ReciboSueldo",
        recibo.id,
        { numero, periodo, empleado: `${emp.legajo} ${emp.apellido}`, netoAPagar: calc.netoAPagar },
        session?.user?.id
      );

      resultados.push({
        legajo: emp.legajo,
        nombre: `${emp.apellido}, ${emp.nombre}`,
        numero,
        netoAPagar: calc.netoAPagar,
        status: "ok",
      });
    } catch (err) {
      resultados.push({
        legajo: emp.legajo,
        nombre: `${emp.apellido}, ${emp.nombre}`,
        numero: "",
        netoAPagar: 0,
        status: "error",
        message: err instanceof Error ? err.message : "Error",
      });
    }
  }

  const ok = resultados.filter((r) => r.status === "ok").length;
  const skip = resultados.filter((r) => r.status === "skip").length;
  const errCount = resultados.filter((r) => r.status === "error").length;

  return NextResponse.json({
    data: {
      periodo,
      tipo,
      resumen: { total: empleadosActivos.length, liquidados: ok, omitidos: skip, errores: errCount },
      resultados,
    },
  });
}
