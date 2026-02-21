import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.report.view,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  // Get all motos with their contratos
  const motos = await prisma.moto.findMany({
    select: {
      id: true,
      patente: true,
      marca: true,
      modelo: true,
      estado: true,
      precioCompra: true,
      createdAt: true,
    },
    orderBy: { patente: "asc" },
  });

  const result = await Promise.all(
    motos.map(async (moto) => {
      // Ingresos: cuotas pagadas de contratos de esta moto
      const cuotasPagadas = await prisma.cuota.aggregate({
        where: {
          contrato: { motoId: moto.id },
          estado: "PAGADA",
        },
        _sum: { monto: true },
        _count: true,
      });

      const ingresoTotal = Number(cuotasPagadas._sum.monto ?? 0);

      // Meses alquilada: count contratos activos months
      const contratos = await prisma.contrato.findMany({
        where: { motoId: moto.id },
        select: { fechaInicio: true, fechaFin: true, estado: true },
      });

      let mesesAlquilada = 0;
      const now = new Date();
      for (const c of contratos) {
        if (!c.fechaInicio) continue;
        const fin = c.fechaFin && c.fechaFin < now ? c.fechaFin : now;
        const diffMs = fin.getTime() - c.fechaInicio.getTime();
        mesesAlquilada += Math.max(1, Math.round(diffMs / (30 * 86400000)));
      }

      const ingresoMensualPromedio = mesesAlquilada > 0 ? ingresoTotal / mesesAlquilada : 0;

      // Costos
      const costoCompra = Number(moto.precioCompra);

      const [costoMantenimiento, costoSeguro] = await Promise.all([
        prisma.gasto.aggregate({
          where: { motoId: moto.id, estado: "APROBADO", categoria: "MANTENIMIENTO" },
          _sum: { monto: true },
        }),
        prisma.gasto.aggregate({
          where: { motoId: moto.id, estado: "APROBADO", categoria: "SEGUROS" },
          _sum: { monto: true },
        }),
      ]);

      const costoMant = Number(costoMantenimiento._sum.monto ?? 0);
      const costoSeg = Number(costoSeguro._sum.monto ?? 0);

      // Depreciation: linear over 60 months (5 years)
      const mesesDesdeCompra = Math.max(
        1,
        Math.round(
          (now.getTime() - moto.createdAt.getTime()) / (30 * 86400000)
        )
      );
      const depreciacionMensual = costoCompra / 60;
      const depreciacionAcumulada = Math.min(
        costoCompra,
        depreciacionMensual * mesesDesdeCompra
      );

      const costoTotal = costoMant + costoSeg + depreciacionAcumulada;
      const resultadoNeto = ingresoTotal - costoTotal;
      const margenNeto = ingresoTotal > 0 ? (resultadoNeto / ingresoTotal) * 100 : ingresoTotal === 0 && costoTotal > 0 ? -100 : 0;
      const roiMoto = costoCompra > 0 ? (resultadoNeto / costoCompra) * 100 : 0;
      const mesesParaRecuperar =
        ingresoMensualPromedio > 0 ? costoCompra / ingresoMensualPromedio : 0;

      return {
        id: moto.id,
        patente: moto.patente,
        marca: moto.marca,
        modelo: moto.modelo,
        estado: moto.estado,
        ingresoTotal,
        ingresoMensualPromedio,
        mesesAlquilada,
        costoCompra,
        costoMantenimiento: costoMant,
        costoSeguro: costoSeg,
        depreciacionAcumulada,
        costoTotal,
        resultadoNeto,
        margenNeto,
        roiMoto,
        mesesParaRecuperar,
        recuperada: ingresoTotal >= costoCompra,
      };
    })
  );

  const motosRentables = result.filter((m) => m.resultadoNeto > 0);
  const margenPromedioFlota =
    result.length > 0
      ? result.reduce((s, m) => s + m.margenNeto, 0) / result.length
      : 0;

  const sorted = [...result].sort((a, b) => b.resultadoNeto - a.resultadoNeto);

  return NextResponse.json({
    data: {
      motos: result,
      resumen: {
        totalMotos: result.length,
        motosRentables: motosRentables.length,
        margenPromedioFlota,
        motoMasRentable: sorted[0]?.patente ?? "-",
        motoMenosRentable: sorted[sorted.length - 1]?.patente ?? "-",
      },
    },
  });
}
