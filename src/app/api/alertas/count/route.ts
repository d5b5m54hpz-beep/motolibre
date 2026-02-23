import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  apiSetup();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const count = await prisma.alerta.count({
      where: { usuarioId: session.user.id, leida: false },
    });

    return NextResponse.json({ count });
  } catch (error: unknown) {
    console.error("Error al contar alertas:", error);
    return NextResponse.json(
      { error: "Error al contar alertas" },
      { status: 500 }
    );
  }
}
