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
        data: { motosRevisadas: 0, alertasCreadas: 0 },
      });
    }

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const mantenimientos = await prisma.mantenimientoProgramado.findMany({
      where: {
        estado: "PROGRAMADO",
        fechaProgramada: {
          gte: now,
          lte: in7Days,
        },
      },
      include: {
        moto: { select: { patente: true, marca: true, modelo: true } },
        contrato: {
          select: {
            cliente: { select: { nombre: true } },
          },
        },
      },
    });

    let alertasCreadas = 0;

    for (const mant of mantenimientos) {
      const diasRestantes = Math.ceil(
        (mant.fechaProgramada.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const motoPatente = mant.moto.patente ?? "S/P";
      const clienteNombre = mant.contrato.cliente.nombre;
      const motoDesc = `${mant.moto.marca} ${mant.moto.modelo} (${motoPatente})`;

      await crearAlerta({
        tipo: "MANTENIMIENTO_PROGRAMADO",
        prioridad: diasRestantes <= 2 ? "ALTA" : "MEDIA",
        titulo: `Mantenimiento #${mant.numero} en ${diasRestantes} d${diasRestantes === 1 ? "\u00eda" : "\u00edas"}`,
        mensaje: `Mantenimiento programado para ${motoDesc} - Cliente: ${clienteNombre}. Fecha: ${mant.fechaProgramada.toLocaleDateString("es-AR")}.`,
        modulo: "mantenimiento",
        entidadTipo: "MantenimientoProgramado",
        entidadId: mant.id,
        usuarioId: admin.id,
        accionUrl: `/mantenimiento/${mant.id}`,
        accionLabel: "Ver mantenimiento",
      });
      alertasCreadas++;
    }

    return NextResponse.json({
      data: { motosRevisadas: mantenimientos.length, alertasCreadas },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Error en cron job mantenimiento-programado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
