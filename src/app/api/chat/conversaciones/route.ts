import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.commercial.contract.update,
    "canView",
    ["ADMIN", "OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  // Obtener contratoIds únicos con mensajes
  const contratoIds = await prisma.mensajeChat.groupBy({
    by: ["contratoId"],
    orderBy: { contratoId: "asc" },
  });

  if (contratoIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const ids = contratoIds.map((c) => c.contratoId);

  // Obtener datos de contratos
  const contratos = await prisma.contrato.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      cliente: { select: { nombre: true, apellido: true } },
      moto: { select: { marca: true, modelo: true } },
    },
  });
  const contratoMap = new Map(contratos.map((c) => [c.id, c]));

  // Obtener último mensaje y conteo de no leídos por contrato
  const conversaciones = await Promise.all(
    ids.map(async (contratoId) => {
      const [ultimoMensaje, noLeidos] = await Promise.all([
        prisma.mensajeChat.findFirst({
          where: { contratoId },
          orderBy: { createdAt: "desc" },
          select: { texto: true, userName: true, userRole: true, createdAt: true },
        }),
        prisma.mensajeChat.count({
          where: { contratoId, leido: false, userRole: "CLIENTE" },
        }),
      ]);

      const contrato = contratoMap.get(contratoId);
      return {
        contratoId,
        clienteNombre: contrato
          ? `${contrato.cliente?.nombre || ""} ${contrato.cliente?.apellido || ""}`.trim()
          : "Sin cliente",
        moto: contrato?.moto ? `${contrato.moto.marca} ${contrato.moto.modelo}` : null,
        ultimoMensaje,
        noLeidos,
      };
    })
  );

  // Ordenar por último mensaje más reciente
  conversaciones.sort((a, b) => {
    const ta = a.ultimoMensaje?.createdAt ? new Date(a.ultimoMensaje.createdAt).getTime() : 0;
    const tb = b.ultimoMensaje?.createdAt ? new Date(b.ultimoMensaje.createdAt).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({ data: conversaciones });
}
