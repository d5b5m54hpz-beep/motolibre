import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.message.approve,
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") || "PENDIENTE";

  const aprobaciones = await prisma.aprobacionMensaje.findMany({
    where: { estado: estado as "PENDIENTE" | "APROBADO" | "RECHAZADO" | "EDITADO" },
    orderBy: { createdAt: "desc" },
    include: {
      mensaje: {
        include: {
          conversacion: {
            include: {
              contactos: {
                include: {
                  contacto: {
                    select: { nombre: true, email: true, tipo: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ data: aprobaciones });
}
