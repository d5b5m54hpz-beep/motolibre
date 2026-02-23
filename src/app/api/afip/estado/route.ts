import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { verificarEstadoAFIP, isAfipConfigured } from "@/lib/services/afip-service";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.invoicing.invoice.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const estado = await verificarEstadoAFIP();

  // Conteo de comprobantes pendientes de CAE
  const [facturasPendientes, ncPendientes] = await Promise.all([
    prisma.factura.count({
      where: { afipResultado: { in: ["PENDIENTE", "R"] } },
    }),
    prisma.notaCredito.count({
      where: { afipResultado: { in: ["PENDIENTE", "R"] } },
    }),
  ]);

  return NextResponse.json({
    data: {
      ...estado,
      configurado: isAfipConfigured(),
      pendientes: {
        facturas: facturasPendientes,
        notasCredito: ncPendientes,
      },
    },
  });
}
