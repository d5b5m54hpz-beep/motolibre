import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearAlerta } from "@/lib/alertas-utils";
import type { PrioridadAlerta } from "@prisma/client";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (!admin) {
      return NextResponse.json({
        data: { procesados: 0, alertasCreadas: 0 },
      });
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const contratos = await prisma.contrato.findMany({
      where: {
        estado: "ACTIVO",
        fechaFin: {
          not: null,
          lte: in30Days,
          gte: now,
        },
      },
      include: {
        cliente: { select: { nombre: true } },
        moto: { select: { patente: true } },
      },
    });

    let alertasCreadas = 0;

    for (const contrato of contratos) {
      const fechaFin = contrato.fechaFin!;
      const diffMs = fechaFin.getTime() - now.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let prioridad: PrioridadAlerta;
      if (diasRestantes <= 7) {
        prioridad = "URGENTE";
      } else if (diasRestantes <= 15) {
        prioridad = "ALTA";
      } else {
        prioridad = "MEDIA";
      }

      const destinatarioId = contrato.creadoPor ?? admin.id;
      const clienteNombre = contrato.cliente.nombre;
      const motoPatente = contrato.moto.patente ?? "S/P";

      await crearAlerta({
        tipo: "CONTRATO_POR_VENCER",
        prioridad,
        titulo: `Contrato por vencer en ${diasRestantes} d${diasRestantes === 1 ? "\u00eda" : "\u00edas"}`,
        mensaje: `El contrato de ${clienteNombre} (moto ${motoPatente}) vence el ${fechaFin.toLocaleDateString("es-AR")}.`,
        modulo: "contratos",
        entidadTipo: "Contrato",
        entidadId: contrato.id,
        usuarioId: destinatarioId,
        accionUrl: `/contratos/${contrato.id}`,
        accionLabel: "Ver contrato",
      });
      alertasCreadas++;
    }

    return NextResponse.json({
      data: { procesados: contratos.length, alertasCreadas },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error en cron job contratos-por-vencer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
