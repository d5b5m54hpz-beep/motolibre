import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { auth } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  apiSetup();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const result = await prisma.alerta.updateMany({
      where: {
        usuarioId: session.user.id,
        leida: false,
      },
      data: {
        leida: true,
        fechaLeida: new Date(),
      },
    });

    return NextResponse.json({ data: { marcadas: result.count } });
  } catch (error: unknown) {
    console.error("Error al marcar todas las alertas como leídas:", error);
    return NextResponse.json(
      { error: "Error al marcar alertas como leídas" },
      { status: 500 }
    );
  }
}
