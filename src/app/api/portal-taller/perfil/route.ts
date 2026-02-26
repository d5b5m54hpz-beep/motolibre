import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";
import bcrypt from "bcryptjs";

const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, "Contraseña actual requerida"),
  passwordNueva: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

/**
 * POST /api/portal-taller/perfil
 * Change password for TALLER_EXTERNO user.
 */
export async function POST(req: NextRequest) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "TALLER_EXTERNO") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = cambiarPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });

  if (!user?.password) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const valid = await bcrypt.compare(parsed.data.passwordActual, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(parsed.data.passwordNueva, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ data: { ok: true } });
}
