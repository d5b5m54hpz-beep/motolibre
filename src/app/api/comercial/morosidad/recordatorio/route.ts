import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { crearAlerta } from "@/lib/alertas-utils";
import { enviarCuotaVencida } from "@/lib/email";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const schema = z.object({
  cuotaIds: z.array(z.string()).min(1).max(50),
  usarIA: z.boolean().default(true),
});

/**
 * POST /api/comercial/morosidad/recordatorio
 * Sends dunning emails (optionally AI-personalized) for given cuota IDs.
 */
export async function POST(req: NextRequest) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!["ADMIN", "COMERCIAL"].includes(session.user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { cuotaIds, usarIA } = parsed.data;
  const enviados: string[] = [];
  const errores: string[] = [];

  for (const cuotaId of cuotaIds) {
    try {
      const cuota = await prisma.cuota.findUnique({
        where: { id: cuotaId },
        include: {
          contrato: {
            include: {
              cliente: { select: { nombre: true, apellido: true, email: true } },
              moto: { select: { marca: true, modelo: true } },
            },
          },
        },
      });

      if (!cuota) {
        errores.push(`Cuota ${cuotaId} no encontrada`);
        continue;
      }

      if (!cuota.contrato.cliente.email) {
        errores.push(`Cliente sin email: ${cuota.contrato.cliente.nombre}`);
        continue;
      }

      const now = new Date();
      const diasVencida = Math.floor(
        (now.getTime() - cuota.fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24)
      );

      const clienteNombre = `${cuota.contrato.cliente.nombre} ${cuota.contrato.cliente.apellido}`;
      const motoModelo = `${cuota.contrato.moto.marca} ${cuota.contrato.moto.modelo}`;
      const monto = Number(cuota.montoPagado ?? cuota.monto);

      // Generate AI message
      let mensajeIA = `Hola ${clienteNombre}, te contactamos de MotoLibre para recordarte que tenés una cuota vencida de $${monto.toLocaleString("es-AR")} correspondiente a tu moto ${motoModelo}. Te pedimos que regularices tu situación a la brevedad para evitar inconvenientes con tu contrato.`;

      if (usarIA) {
        const { text } = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          prompt: `Generá un mensaje de recordatorio de pago para un cliente de MotoLibre (empresa argentina de alquiler de motos) en español argentino informal pero respetuoso.

Cliente: ${clienteNombre}
Moto: ${motoModelo}
Cuota vencida hace: ${diasVencida} días
Monto: $${monto.toLocaleString("es-AR")}

El mensaje debe:
- Ser empático y no amenazante
- Mencionar el tiempo vencido y el monto
- Invitar a regularizar la situación
- Ser de 2-3 oraciones máximo
- NO incluir saludos de apertura (ya está en el template) ni despedida

Solo el cuerpo del mensaje, sin comillas.`,
          maxOutputTokens: 150,
        });
        mensajeIA = text.trim();
      }

      await enviarCuotaVencida({
        to: cuota.contrato.cliente.email,
        clienteNombre,
        contratoNumero: cuota.contratoId.slice(-6).toUpperCase(),
        motoModelo,
        cuotaNumero: cuota.numero,
        monto,
        diasVencida,
        mensajeIA,
      });

      // Update ultimo recordatorio
      await prisma.cuota.update({
        where: { id: cuotaId },
        data: { ultimoRecordatorio: now },
      });

      // Notify admin
      await crearAlerta({
        tipo: "SISTEMA",
        titulo: `Recordatorio enviado a ${clienteNombre}`,
        mensaje: `Cuota #${cuota.numero} — $${monto.toLocaleString("es-AR")} — ${diasVencida} días vencida`,
        prioridad: "BAJA",
        modulo: "comercial",
        entidadTipo: "Contrato",
        entidadId: cuota.contratoId,
        usuarioId: session.user.id,
        accionUrl: `/admin/contratos/${cuota.contratoId}`,
        accionLabel: "Ver contrato",
      });

      enviados.push(cuotaId);
    } catch (err) {
      console.error(`[recordatorio] Error para cuota ${cuotaId}:`, err);
      errores.push(`Error en cuota ${cuotaId}: ${err instanceof Error ? err.message : "desconocido"}`);
    }
  }

  return NextResponse.json({ data: { enviados: enviados.length, errores } });
}
