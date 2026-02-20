import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

/**
 * Verifica que el usuario esté autenticado y tenga uno de los roles requeridos.
 * Uso legacy — preferir requirePermission() cuando el sistema de permisos esté listo (punto 0.3).
 */
export async function requireRole(...roles: Role[]) {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      ),
      userId: null,
      session: null,
    };
  }

  if (roles.length > 0 && !roles.includes(session.user.role)) {
    return {
      error: NextResponse.json(
        { error: "Sin permisos para esta acción" },
        { status: 403 }
      ),
      userId: session.user.id,
      session,
    };
  }

  return {
    error: null,
    userId: session.user.id,
    session,
  };
}
