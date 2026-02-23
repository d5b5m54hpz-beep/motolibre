import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { auth } from "@/lib/auth";

export async function DELETE(
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

    await prisma.alerta.delete({ where: { id } });

    return NextResponse.json({ data: { eliminada: true } });
  } catch (error: unknown) {
    console.error("Error al eliminar alerta:", error);
    return NextResponse.json(
      { error: "Error al eliminar alerta" },
      { status: 500 }
    );
  }
}
