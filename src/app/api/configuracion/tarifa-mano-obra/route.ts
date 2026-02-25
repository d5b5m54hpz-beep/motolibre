import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  // 1. Try taller interno principal
  const tallerInterno = await prisma.taller.findFirst({
    where: { tipo: "INTERNO", activo: true, tarifaHora: { not: null } },
    select: { tarifaHora: true, nombre: true },
    orderBy: { createdAt: "asc" },
  });

  if (tallerInterno?.tarifaHora) {
    return NextResponse.json({
      data: {
        tarifaHora: tallerInterno.tarifaHora,
        fuente: `Taller: ${tallerInterno.nombre}`,
      },
    });
  }

  // 2. Try configuracion empresa
  const config = await prisma.configuracionEmpresa.findFirst({
    select: {
      costoHoraMecanico: true,
      sueldoBrutoMecanico: true,
      cargasSocialesPct: true,
      horasLaborablesMes: true,
    },
  });

  if (config?.costoHoraMecanico) {
    return NextResponse.json({
      data: {
        tarifaHora: config.costoHoraMecanico,
        fuente: "Configuración empresa",
      },
    });
  }

  // 3. Calculate from sueldoBruto if available
  if (config?.sueldoBrutoMecanico) {
    const cargas = config.cargasSocialesPct ?? 0.43;
    const horas = config.horasLaborablesMes ?? 176;
    const costo = (config.sueldoBrutoMecanico * (1 + cargas)) / horas;
    return NextResponse.json({
      data: {
        tarifaHora: Math.round(costo),
        fuente: "Calculado desde sueldo bruto",
      },
    });
  }

  // 4. Calculate from average mechanic salary
  const mecanicosSalaries = await prisma.mecanico.findMany({
    where: {
      activo: true,
      empleado: { estado: "ACTIVO" },
    },
    select: {
      empleado: {
        select: { sueldoBasico: true },
      },
    },
  });

  if (mecanicosSalaries.length > 0) {
    const sueldos = mecanicosSalaries
      .map((m) => m.empleado?.sueldoBasico)
      .filter((s): s is NonNullable<typeof s> => s != null)
      .map((s) => Number(s));

    if (sueldos.length > 0) {
      const promedio = sueldos.reduce((a, b) => a + b, 0) / sueldos.length;
      const cargas = 0.43;
      const horas = 176;
      const costo = (promedio * (1 + cargas)) / horas;
      return NextResponse.json({
        data: {
          tarifaHora: Math.round(costo),
          fuente: `Promedio de ${sueldos.length} mecánico(s)`,
        },
      });
    }
  }

  // 5. No config available
  return NextResponse.json({
    data: { tarifaHora: null, fuente: null },
  });
}
