import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

/**
 * GET /api/comercial/morosidad
 * Returns aging report + per-client delinquency data.
 */
export async function GET() {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const role = session.user.role;
  if (!["ADMIN", "COMERCIAL", "CONTADOR"].includes(role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const now = new Date();

  // Fetch all VENCIDA cuotas with their contract + client + moto
  const cuotasVencidas = await prisma.cuota.findMany({
    where: { estado: "VENCIDA" },
    include: {
      contrato: {
        include: {
          cliente: { select: { id: true, nombre: true, apellido: true, email: true } },
          moto: { select: { marca: true, modelo: true, patente: true } },
        },
      },
    },
    orderBy: { fechaVencimiento: "asc" },
  });

  // Total active contracts for portfolio %
  const totalContratos = await prisma.contrato.count({
    where: { estado: "ACTIVO" },
  });

  // Aggregate by client+contract
  type ClienteData = {
    clienteId: string;
    clienteNombre: string;
    clienteEmail: string;
    contratoId: string;
    motoModelo: string;
    cuotasVencidas: number;
    montoTotal: number;
    diasMaxVencido: number;
    riesgo: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    ultimoRecordatorio: string | null;
    cuotaIds: string[];
  };

  const clienteMap = new Map<string, ClienteData>();

  for (const cuota of cuotasVencidas) {
    const { contrato } = cuota;
    const key = `${contrato.clienteId}__${contrato.id}`;
    const dias = Math.floor(
      (now.getTime() - cuota.fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24)
    );
    const monto = Number(cuota.montoPagado ?? cuota.monto);

    if (!clienteMap.has(key)) {
      clienteMap.set(key, {
        clienteId: contrato.clienteId,
        clienteNombre: `${contrato.cliente.nombre} ${contrato.cliente.apellido}`,
        clienteEmail: contrato.cliente.email ?? "",
        contratoId: contrato.id,
        motoModelo: `${contrato.moto.marca} ${contrato.moto.modelo}`,
        cuotasVencidas: 0,
        montoTotal: 0,
        diasMaxVencido: 0,
        riesgo: "LOW",
        ultimoRecordatorio: cuota.ultimoRecordatorio?.toISOString() ?? null,
        cuotaIds: [],
      });
    }

    const entry = clienteMap.get(key)!;
    entry.cuotasVencidas++;
    entry.montoTotal += monto;
    entry.diasMaxVencido = Math.max(entry.diasMaxVencido, dias);
    entry.cuotaIds.push(cuota.id);
    // Keep most recent recordatorio
    if (
      cuota.ultimoRecordatorio &&
      (!entry.ultimoRecordatorio ||
        cuota.ultimoRecordatorio.toISOString() > entry.ultimoRecordatorio)
    ) {
      entry.ultimoRecordatorio = cuota.ultimoRecordatorio.toISOString();
    }
  }

  // Assign risk level
  const clientes: ClienteData[] = [];
  for (const entry of clienteMap.values()) {
    const d = entry.diasMaxVencido;
    if (d > 90 || entry.cuotasVencidas >= 3) {
      entry.riesgo = "CRITICAL";
    } else if (d > 60) {
      entry.riesgo = "HIGH";
    } else if (d > 30) {
      entry.riesgo = "MEDIUM";
    } else {
      entry.riesgo = "LOW";
    }
    clientes.push(entry);
  }

  // Sort by criticality desc
  clientes.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.riesgo] - order[b.riesgo] || b.montoTotal - a.montoTotal;
  });

  // Aging buckets (by cuota)
  const aging = { d1_30: { count: 0, monto: 0 }, d31_60: { count: 0, monto: 0 }, d61_90: { count: 0, monto: 0 }, d90plus: { count: 0, monto: 0 } };

  for (const cuota of cuotasVencidas) {
    const dias = Math.floor(
      (now.getTime() - cuota.fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24)
    );
    const monto = Number(cuota.montoPagado ?? cuota.monto);
    if (dias <= 30) {
      aging.d1_30.count++;
      aging.d1_30.monto += monto;
    } else if (dias <= 60) {
      aging.d31_60.count++;
      aging.d31_60.monto += monto;
    } else if (dias <= 90) {
      aging.d61_90.count++;
      aging.d61_90.monto += monto;
    } else {
      aging.d90plus.count++;
      aging.d90plus.monto += monto;
    }
  }

  const totalEnMora = clientes.reduce((s, c) => s + c.montoTotal, 0);
  const contratosSuspendibles = clientes.filter((c) => c.riesgo === "CRITICAL").length;

  return NextResponse.json({
    data: {
      resumen: {
        totalEnMora,
        clientesAfectados: clientes.length,
        contratosSuspendibles,
        porcentajeCartera:
          totalContratos > 0
            ? Math.round((clientes.length / totalContratos) * 100 * 10) / 10
            : 0,
      },
      aging,
      clientes,
    },
  });
}
