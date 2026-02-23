import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { procesarLeaseToOwn } from "@/lib/lease-to-own";

export async function POST(_req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.contract.finalizePurchase,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const transferencias = await procesarLeaseToOwn(userId ?? undefined);

  return NextResponse.json({
    data: {
      transferencias,
      total: transferencias.length,
      mensaje:
        transferencias.length > 0
          ? `${transferencias.length} moto(s) transferida(s) automáticamente por lease-to-own`
          : "No hay contratos lease-to-own listos para transferir",
    },
  });
}
