import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.system.user.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;

  // No se puede resetear la propia contrasena por esta via
  if (userId === id) {
    return NextResponse.json(
      { error: "No puedes resetear tu propia contrasena desde este endpoint" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  // Generar contrasena aleatoria de 12 caracteres
  const newPassword = crypto.randomBytes(9).toString("base64").slice(0, 12);
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ password: newPassword });
}
