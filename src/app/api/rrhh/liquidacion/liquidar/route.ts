import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { liquidacionSchema } from "@/lib/validations/rrhh";
import { calcularLiquidacion, proximoNumeroRecibo } from "@/lib/rrhh-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.hr.payroll.liquidate,
    "canExecute",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = liquidacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Check duplicate
  const existing = await prisma.reciboSueldo.findUnique({
    where: {
      empleadoId_tipo_periodo: {
        empleadoId: parsed.data.empleadoId,
        tipo: parsed.data.tipo,
        periodo: parsed.data.periodo,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Ya existe recibo ${existing.numero} para este período/tipo` },
      { status: 409 }
    );
  }

  try {
    const calc = await calcularLiquidacion(parsed.data);
    const numero = await proximoNumeroRecibo();

    const recibo = await prisma.reciboSueldo.create({
      data: {
        numero,
        empleadoId: parsed.data.empleadoId,
        tipo: parsed.data.tipo,
        estado: "LIQUIDADO",
        periodo: parsed.data.periodo,
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

    // Emit event → accounting handler creates journal entry
    const { eventBus } = await import("@/lib/events/event-bus");
    await eventBus.emit(
      OPERATIONS.hr.payroll.liquidate,
      "ReciboSueldo",
      recibo.id,
      {
        numero,
        periodo: parsed.data.periodo,
        empleado: `${calc.empleado.legajo} ${calc.empleado.apellido}`,
        netoAPagar: calc.netoAPagar,
      },
      session?.user?.id
    );

    return NextResponse.json({ data: { recibo, calc } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al liquidar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
