import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { apiSetup } from "@/lib/api-helpers";
import { iniciarConciliacionSchema } from "@/lib/validations/conciliacion";
import {
  proximoNumeroConciliacion,
  ejecutarMatching,
} from "@/lib/conciliacion-utils";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.import,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const cuentaBancariaId = searchParams.get("cuentaBancariaId");
  const estado = searchParams.get("estado");

  const where: Record<string, unknown> = {};
  if (cuentaBancariaId) where.cuentaBancariaId = cuentaBancariaId;
  if (estado) where.estado = estado;

  const data = await prisma.conciliacion.findMany({
    where,
    include: {
      cuentaBancaria: {
        select: { nombre: true, banco: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.match,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = iniciarConciliacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { cuentaBancariaId, periodoDesde, periodoHasta } = parsed.data;
  const desde = new Date(periodoDesde);
  const hasta = new Date(periodoHasta);

  // 1. Crear conciliación
  const numero = await proximoNumeroConciliacion();
  const conciliacion = await prisma.conciliacion.create({
    data: {
      numero,
      cuentaBancariaId,
      periodoDesde: desde,
      periodoHasta: hasta,
      estado: "EN_PROCESO",
      totalExtractos: 0,
      totalConciliados: 0,
      totalNoConciliados: 0,
    },
  });

  // 2. Ejecutar matching automático
  const matches = await ejecutarMatching({
    cuentaBancariaId,
    periodoDesde: desde,
    periodoHasta: hasta,
  });

  // 3. Contar total de extractos del período
  const totalExtractos = await prisma.extractoBancario.count({
    where: {
      cuentaBancariaId,
      fecha: { gte: desde, lte: hasta },
      conciliado: false,
    },
  });

  // 4. Crear ConciliacionMatch para cada resultado propuesto
  for (const match of matches) {
    await prisma.conciliacionMatch.create({
      data: {
        conciliacionId: conciliacion.id,
        extractoId: match.extractoId,
        entidadTipo: match.entidadTipo,
        entidadId: match.entidadId,
        entidadLabel: match.entidadLabel,
        tipoMatch: match.tipoMatch,
        confianza: match.confianza,
        montoBanco: match.montoBanco,
        montoSistema: match.montoSistema,
        diferencia: match.diferencia,
        estado: "PROPUESTO",
      },
    });
  }

  // 5. Actualizar estadísticas de la conciliación
  const totalConciliados = matches.length;
  const totalNoConciliados = totalExtractos - totalConciliados;

  const conciliacionActualizada = await prisma.conciliacion.update({
    where: { id: conciliacion.id },
    data: {
      totalExtractos,
      totalConciliados,
      totalNoConciliados: totalNoConciliados > 0 ? totalNoConciliados : 0,
    },
    include: {
      matches: { orderBy: { confianza: "desc" } },
      cuentaBancaria: { select: { nombre: true, banco: true } },
    },
  });

  // 6. Emitir evento
  const { eventBus } = await import("@/lib/events/event-bus");
  await eventBus.emit(
    OPERATIONS.finance.bankReconciliation.match,
    "Conciliacion",
    conciliacion.id,
    {
      numero,
      totalExtractos,
      totalConciliados,
      totalNoConciliados: totalNoConciliados > 0 ? totalNoConciliados : 0,
    },
    session?.user?.id
  );

  return NextResponse.json({ data: conciliacionActualizada }, { status: 201 });
}
