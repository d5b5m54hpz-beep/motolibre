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
        data: { documentosRevisados: 0, alertasCreadas: 0 },
      });
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const documentos = await prisma.documentoEmpleado.findMany({
      where: {
        fechaVencimiento: {
          not: null,
          gte: now,
          lte: in30Days,
        },
      },
      include: {
        empleado: { select: { nombre: true, apellido: true } },
      },
    });

    let alertasCreadas = 0;

    for (const doc of documentos) {
      const fechaVenc = doc.fechaVencimiento!;
      const diasRestantes = Math.ceil(
        (fechaVenc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const empleadoNombre = `${doc.empleado.nombre} ${doc.empleado.apellido}`;

      await crearAlerta({
        tipo: "DOCUMENTO_POR_VENCER",
        prioridad: diasRestantes <= 7 ? "ALTA" : "MEDIA",
        titulo: `Documento por vencer: ${doc.nombre}`,
        mensaje: `El documento "${doc.nombre}" de ${empleadoNombre} vence el ${fechaVenc.toLocaleDateString("es-AR")} (${diasRestantes} d${diasRestantes === 1 ? "\u00eda" : "\u00edas"}).`,
        modulo: "rrhh",
        entidadTipo: "DocumentoEmpleado",
        entidadId: doc.id,
        usuarioId: admin.id,
        accionUrl: `/admin/rrhh/empleados/${doc.empleadoId}`,
        accionLabel: "Ver empleado",
      });
      alertasCreadas++;
    }

    return NextResponse.json({
      data: { documentosRevisados: documentos.length, alertasCreadas },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Error en cron job documentos-por-vencer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
