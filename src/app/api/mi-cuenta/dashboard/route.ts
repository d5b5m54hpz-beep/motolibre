import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { contratoNumero } from "@/lib/contrato-display";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const cliente = await prisma.cliente.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      telefono: true,
    },
  });

  if (!cliente) {
    return NextResponse.json({
      data: { cliente: null, contratoActivo: null, moto: null, proximoPago: null, resumenPagos: null },
    });
  }

  const contrato = await prisma.contrato.findFirst({
    where: { clienteId: cliente.id, estado: "ACTIVO" },
    include: {
      moto: {
        select: {
          id: true, marca: true, modelo: true, anio: true, km: true,
          color: true, patente: true, imagenUrl: true, fotos: true, estado: true,
        },
      },
      cuotas: { orderBy: { numero: "asc" } },
    },
  });

  if (!contrato) {
    return NextResponse.json({
      data: { cliente, contratoActivo: null, moto: null, proximoPago: null, resumenPagos: null },
    });
  }

  const cuotas = contrato.cuotas;
  const cuotasPagadas = cuotas.filter((c) => c.estado === "PAGADA").length;
  const cuotasPendientes = cuotas.filter((c) => c.estado === "PENDIENTE").length;
  const cuotasVencidas = cuotas.filter((c) => c.estado === "VENCIDA").length;
  const totalPagado = cuotas
    .filter((c) => c.estado === "PAGADA")
    .reduce((sum, c) => sum + Number(c.montoPagado ?? c.monto), 0);

  const proximaCuota = cuotas.find(
    (c) => c.estado === "PENDIENTE" || c.estado === "VENCIDA"
  );

  const ultimosPagos = cuotas
    .filter((c) => c.estado === "PAGADA" && c.fechaPago)
    .sort((a, b) => new Date(b.fechaPago!).getTime() - new Date(a.fechaPago!).getTime())
    .slice(0, 5)
    .map((c) => ({
      cuotaNumero: c.numero,
      monto: Number(c.monto),
      fechaPago: c.fechaPago,
    }));

  const foto = contrato.moto.fotos[0] ?? contrato.moto.imagenUrl ?? null;

  const diasRestantes = proximaCuota
    ? Math.ceil(
        (new Date(proximaCuota.fechaVencimiento).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return NextResponse.json({
    data: {
      cliente,
      contratoActivo: {
        id: contrato.id,
        numero: contratoNumero(contrato),
        plan: contrato.esLeaseToOwn
          ? `Lease-to-Own ${contrato.duracionMeses}M`
          : contrato.frecuenciaPago === "SEMANAL"
            ? "Semanal"
            : "Mensual",
        frecuencia: contrato.frecuenciaPago,
        montoCuota: Number(contrato.montoPeriodo),
        estado: contrato.estado,
        fechaInicio: contrato.fechaInicio,
        incluyeTransferencia: contrato.esLeaseToOwn,
        cuotasPagadas,
        cuotasTotal: cuotas.length,
        progreso: cuotas.length > 0 ? Math.round((cuotasPagadas / cuotas.length) * 100) : 0,
      },
      moto: {
        id: contrato.moto.id,
        marca: contrato.moto.marca,
        modelo: contrato.moto.modelo,
        anio: contrato.moto.anio,
        km: contrato.moto.km,
        foto,
        patente: contrato.moto.patente ?? "—",
        color: contrato.moto.color ?? "—",
        estado: contrato.moto.estado,
      },
      proximoPago: proximaCuota
        ? {
            cuotaId: proximaCuota.id,
            numero: proximaCuota.numero,
            monto: Number(proximaCuota.monto),
            fechaVencimiento: proximaCuota.fechaVencimiento,
            diasRestantes,
            estado: proximaCuota.estado,
          }
        : null,
      resumenPagos: {
        totalPagado,
        pagosAlDia: cuotasPagadas,
        pagosVencidos: cuotasVencidas,
        pagosPendientes: cuotasPendientes,
      },
      ultimosPagos,
    },
  });
}
