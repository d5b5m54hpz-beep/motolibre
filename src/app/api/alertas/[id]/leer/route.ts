import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { auth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const alerta = await prisma.alerta.findUnique({ where: { id } });
    if (!alerta) {
      return NextResponse.json(
        { error: "Alerta no encontrada" },
        { status: 404 }
      );
    }

    if (alerta.usuarioId !== session.user.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const updated = await prisma.alerta.update({
      where: { id },
      data: {
        leida: true,
        fechaLeida: new Date(),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    console.error("Error al marcar alerta como leída:", error);
    return NextResponse.json(
      { error: "Error al marcar alerta como leída" },
      { status: 500 }
    );
  }
}
