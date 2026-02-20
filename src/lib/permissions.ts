import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import type { Session } from "next-auth";

/**
 * Tipo de permiso que se verifica.
 */
export type PermissionType = "canView" | "canCreate" | "canExecute" | "canApprove";

/**
 * Cache en memoria para permisos (se limpia por request en serverless).
 */
const permissionCache = new Map<string, Record<string, Record<PermissionType, boolean>>>();

/**
 * Obtiene los permisos de un usuario como un mapa de operationId → permisos.
 */
async function getUserPermissions(
  userId: string
): Promise<Record<string, Record<PermissionType, boolean>>> {
  if (permissionCache.has(userId)) {
    return permissionCache.get(userId)!;
  }

  const userProfiles = await prisma.userProfile.findMany({
    where: { userId },
    include: {
      profile: {
        include: {
          grants: true,
        },
      },
    },
  });

  const permissions: Record<string, Record<PermissionType, boolean>> = {};

  for (const up of userProfiles) {
    for (const grant of up.profile.grants) {
      if (!permissions[grant.operationId]) {
        permissions[grant.operationId] = {
          canView: false,
          canCreate: false,
          canExecute: false,
          canApprove: false,
        };
      }
      // OR merge — si cualquier perfil otorga el permiso, se otorga
      if (grant.canView) permissions[grant.operationId]!.canView = true;
      if (grant.canCreate) permissions[grant.operationId]!.canCreate = true;
      if (grant.canExecute) permissions[grant.operationId]!.canExecute = true;
      if (grant.canApprove) permissions[grant.operationId]!.canApprove = true;
    }
  }

  permissionCache.set(userId, permissions);
  return permissions;
}

/**
 * Verifica si un usuario tiene permiso para una operación.
 * Soporta wildcards: grant de "fleet.*" cubre "fleet.moto.create".
 */
function checkPermission(
  permissions: Record<string, Record<PermissionType, boolean>>,
  operationId: string,
  permType: PermissionType
): boolean {
  // Check exacto
  if (permissions[operationId]?.[permType]) return true;

  // Check wildcards
  const parts = operationId.split(".");
  for (let i = parts.length - 1; i >= 1; i--) {
    const wildcard = parts.slice(0, i).join(".") + ".*";
    if (permissions[wildcard]?.[permType]) return true;
  }

  return false;
}

/**
 * requirePermission — el guardián de cada API route.
 *
 * Uso en API routes:
 * const { error, userId, session } = await requirePermission(
 *   OPERATIONS.fleet.moto.create,
 *   "canCreate",
 *   ["ADMIN", "OPERADOR"]  // fallback por rol si no tiene perfil asignado
 * );
 * if (error) return error;
 */
export async function requirePermission(
  operationId: string,
  permType: PermissionType,
  fallbackRoles?: Role[]
): Promise<{
  error: NextResponse | null;
  userId: string | null;
  session: Session | null;
}> {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
      userId: null,
      session: null,
    };
  }

  const userId = session.user.id;
  const userRole = session.user.role;

  // ADMIN siempre tiene acceso total
  if (userRole === "ADMIN") {
    return { error: null, userId, session };
  }

  // Verificar permisos por perfil
  const permissions = await getUserPermissions(userId);
  if (checkPermission(permissions, operationId, permType)) {
    return { error: null, userId, session };
  }

  // Fallback por rol (para compatibilidad y simplicidad)
  if (fallbackRoles && fallbackRoles.includes(userRole)) {
    return { error: null, userId, session };
  }

  return {
    error: NextResponse.json(
      { error: "Sin permisos para esta acción" },
      { status: 403 }
    ),
    userId,
    session,
  };
}
