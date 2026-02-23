import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(_req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.system.diagnostico.repair,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find all motos marked as ALQUILADA but with no active contract
      const motosHuerfanas = await tx.moto.findMany({
        where: {
          estado: "ALQUILADA",
          contratos: { none: { estado: "ACTIVO" } },
        },
        select: { id: true, patente: true },
      });

      // Update each orphan moto to DISPONIBLE
      for (const moto of motosHuerfanas) {
        await tx.moto.update({
          where: { id: moto.id },
          data: { estado: "DISPONIBLE" },
        });
      }

      return {
        reparadas: motosHuerfanas.length,
        motos: motosHuerfanas.map((m) => m.patente),
      };
    });

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al reparar motos huérfanas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
