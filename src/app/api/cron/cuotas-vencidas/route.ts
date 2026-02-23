import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearAlerta } from "@/lib/alertas-utils";

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
        data: { cuotasVencidas: 0, alertasCreadas: 0 },
      });
    }

    const now = new Date();

    const cuotasPendientes = await prisma.cuota.findMany({
      where: {
        estado: "PENDIENTE",
        fechaVencimiento: { lt: now },
      },
      include: {
        contrato: {
          select: {
            id: true,
            creadoPor: true,
            cliente: { select: { nombre: true } },
          },
        },
      },
    });

    let alertasCreadas = 0;

    for (const cuota of cuotasPendientes) {
      // Update cuota to VENCIDA
      await prisma.cuota.update({
        where: { id: cuota.id },
        data: { estado: "VENCIDA" },
      });

      const destinatarioId = cuota.contrato.creadoPor ?? admin.id;
      const clienteNombre = cuota.contrato.cliente.nombre;

      await crearAlerta({
        tipo: "CUOTA_VENCIDA",
        prioridad: "ALTA",
        titulo: `Cuota #${cuota.numero} vencida`,
        mensaje: `La cuota #${cuota.numero} de ${clienteNombre} por $${cuota.monto.toString()} venci\u00f3 el ${cuota.fechaVencimiento.toLocaleDateString("es-AR")}.`,
        modulo: "contratos",
        entidadTipo: "Cuota",
        entidadId: cuota.id,
        usuarioId: destinatarioId,
        accionUrl: `/contratos/${cuota.contrato.id}`,
        accionLabel: "Ver contrato",
      });
      alertasCreadas++;
    }

    return NextResponse.json({
      data: { cuotasVencidas: cuotasPendientes.length, alertasCreadas },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error en cron job cuotas-vencidas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
