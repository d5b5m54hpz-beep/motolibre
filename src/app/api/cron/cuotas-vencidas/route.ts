import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearAlerta } from "@/lib/alertas-utils";
import { enviarRecordatorioPago } from "@/lib/email";

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
            cliente: { select: { nombre: true, apellido: true, email: true } },
          moto: { select: { marca: true, modelo: true } },
          },
        },
      },
    });

    let alertasCreadas = 0;
    let emailsEnviados = 0;

    for (const cuota of cuotasPendientes) {
      // Update cuota to VENCIDA
      await prisma.cuota.update({
        where: { id: cuota.id },
        data: { estado: "VENCIDA", ultimoRecordatorio: now },
      });

      const destinatarioId = cuota.contrato.creadoPor ?? admin.id;
      const clienteNombre = `${cuota.contrato.cliente.nombre} ${cuota.contrato.cliente.apellido}`;

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

      // Send reminder email to client (fire and forget)
      if (cuota.contrato.cliente.email) {
        const diasVencida = Math.floor(
          (now.getTime() - cuota.fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24)
        );
        const fechaVencimientoStr = cuota.fechaVencimiento.toLocaleDateString("es-AR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        enviarRecordatorioPago({
          to: cuota.contrato.cliente.email,
          clienteNombre,
          contratoNumero: cuota.contratoId.slice(-6).toUpperCase(),
          motoModelo: `${cuota.contrato.moto.marca} ${cuota.contrato.moto.modelo}`,
          cuotaNumero: cuota.numero,
          monto: Number(cuota.monto),
          fechaVencimiento: fechaVencimientoStr,
          diasVencida,
        })
          .then(() => { emailsEnviados++; })
          .catch((err) => {
            console.error(`[cron] Error enviando email cuota ${cuota.id}:`, err);
          });
      }
    }

    return NextResponse.json({
      data: { cuotasVencidas: cuotasPendientes.length, alertasCreadas, emailsEnviados },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error en cron job cuotas-vencidas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
