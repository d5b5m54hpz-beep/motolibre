import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Calculate total expected cuotas based on contract duration and payment frequency.
 */
function calcularCuotasEsperadas(
  duracionMeses: number,
  frecuencia: "SEMANAL" | "QUINCENAL" | "MENSUAL"
): number {
  switch (frecuencia) {
    case "SEMANAL":
      // ~4.33 weeks per month
      return Math.ceil(duracionMeses * (30 / 7));
    case "QUINCENAL":
      return duracionMeses * 2;
    case "MENSUAL":
      return duracionMeses;
  }
}

/**
 * Calculate the due date for a cuota based on the contract start date,
 * cuota number (1-based), and payment frequency.
 */
function calcularFechaVencimiento(
  fechaInicio: Date,
  numero: number,
  frecuencia: "SEMANAL" | "QUINCENAL" | "MENSUAL"
): Date {
  const fecha = new Date(fechaInicio);

  switch (frecuencia) {
    case "SEMANAL":
      fecha.setDate(fecha.getDate() + numero * 7);
      break;
    case "QUINCENAL":
      fecha.setDate(fecha.getDate() + numero * 15);
      break;
    case "MENSUAL":
      fecha.setMonth(fecha.getMonth() + numero);
      break;
  }

  return fecha;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contratos = await prisma.contrato.findMany({
      where: { estado: "ACTIVO" },
      include: {
        cuotas: {
          select: { numero: true },
          orderBy: { numero: "desc" },
          take: 1,
        },
        _count: { select: { cuotas: true } },
      },
    });

    let cuotasGeneradas = 0;

    for (const contrato of contratos) {
      if (!contrato.fechaInicio) continue;

      const totalEsperadas = calcularCuotasEsperadas(
        contrato.duracionMeses,
        contrato.frecuenciaPago
      );
      const cuotasExistentes = contrato._count.cuotas;

      if (cuotasExistentes >= totalEsperadas) continue;

      // Get the highest existing cuota number
      const maxNumero = contrato.cuotas[0]?.numero ?? 0;

      // Generate missing cuotas
      const cuotasToCreate = [];
      for (let i = maxNumero + 1; i <= totalEsperadas; i++) {
        cuotasToCreate.push({
          contratoId: contrato.id,
          numero: i,
          monto: contrato.montoPeriodo,
          fechaVencimiento: calcularFechaVencimiento(
            contrato.fechaInicio,
            i,
            contrato.frecuenciaPago
          ),
          estado: "PENDIENTE" as const,
        });
      }

      if (cuotasToCreate.length > 0) {
        await prisma.cuota.createMany({ data: cuotasToCreate });
        cuotasGeneradas += cuotasToCreate.length;
      }
    }

    return NextResponse.json({
      data: { cuotasGeneradas },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error en cron job generar-cuotas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
