import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerCAEFactura, obtenerCAENotaCredito } from "@/lib/facturacion-utils";
import { crearAlerta } from "@/lib/alertas-utils";

const MAX_REINTENTOS = 5;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    // ── Facturas pendientes de CAE ──
    const facturasPendientes = await prisma.factura.findMany({
      where: {
        OR: [
          { afipResultado: "PENDIENTE" },
          { afipResultado: "R" },
        ],
        afipReintentos: { lt: MAX_REINTENTOS },
      },
    });

    let facturasResueltas = 0;
    let facturasFallidas = 0;

    for (const factura of facturasPendientes) {
      try {
        const result = await obtenerCAEFactura({
          tipo: factura.tipo,
          puntoVenta: factura.puntoVenta,
          importeNeto: Number(factura.montoNeto),
          importeIVA: Number(factura.montoIva),
          importeTotal: Number(factura.montoTotal),
          condicionIVAReceptor: factura.receptorCondicionIva,
          documentoReceptor: factura.receptorCuit || "0",
          periodoDesde: factura.periodoDesde,
          periodoHasta: factura.periodoHasta,
        });

        if (result.afipResultado === "A" || result.afipResultado === "STUB") {
          await prisma.factura.update({
            where: { id: factura.id },
            data: {
              cae: result.cae || null,
              caeVencimiento: result.caeVencimiento,
              afipResultado: result.afipResultado,
              afipObservaciones: null,
              afipReintentos: { increment: 1 },
            },
          });
          facturasResueltas++;
        } else {
          await prisma.factura.update({
            where: { id: factura.id },
            data: {
              afipResultado: result.afipResultado,
              afipObservaciones: result.afipObservaciones,
              afipReintentos: { increment: 1 },
            },
          });
          facturasFallidas++;
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        await prisma.factura.update({
          where: { id: factura.id },
          data: {
            afipObservaciones: `Reintento fallido: ${msg}`,
            afipReintentos: { increment: 1 },
          },
        });
        facturasFallidas++;
      }
    }

    // ── NC pendientes de CAE ──
    const ncPendientes = await prisma.notaCredito.findMany({
      where: {
        OR: [
          { afipResultado: "PENDIENTE" },
          { afipResultado: "R" },
        ],
        afipReintentos: { lt: MAX_REINTENTOS },
      },
    });

    let ncResueltas = 0;
    let ncFallidas = 0;

    for (const nc of ncPendientes) {
      try {
        const facturaOriginal = await prisma.factura.findUnique({
          where: { id: nc.facturaId },
        });
        if (!facturaOriginal) {
          ncFallidas++;
          continue;
        }

        const result = await obtenerCAENotaCredito({
          letraFacturaOriginal: facturaOriginal.tipo,
          puntoVenta: nc.puntoVenta,
          importeNeto: Number(nc.montoNeto),
          importeIVA: Number(nc.montoIva),
          importeTotal: Number(nc.montoTotal),
          condicionIVAReceptor: nc.receptorCondicionIva,
          documentoReceptor: nc.receptorCuit || "0",
          facturaOriginalNumero: facturaOriginal.numero,
          facturaOriginalPuntoVenta: facturaOriginal.puntoVenta,
          facturaOriginalFecha: facturaOriginal.fechaEmision,
        });

        if (result.afipResultado === "A" || result.afipResultado === "STUB") {
          await prisma.notaCredito.update({
            where: { id: nc.id },
            data: {
              cae: result.cae || null,
              caeVencimiento: result.caeVencimiento,
              afipResultado: result.afipResultado,
              afipObservaciones: null,
              afipReintentos: { increment: 1 },
            },
          });
          ncResueltas++;
        } else {
          await prisma.notaCredito.update({
            where: { id: nc.id },
            data: {
              afipResultado: result.afipResultado,
              afipObservaciones: result.afipObservaciones,
              afipReintentos: { increment: 1 },
            },
          });
          ncFallidas++;
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        await prisma.notaCredito.update({
          where: { id: nc.id },
          data: {
            afipObservaciones: `Reintento fallido: ${msg}`,
            afipReintentos: { increment: 1 },
          },
        });
        ncFallidas++;
      }
    }

    // Alerta si hay comprobantes que alcanzaron el máximo de reintentos
    const maxReintentos = await prisma.factura.count({
      where: { afipResultado: { in: ["PENDIENTE", "R"] }, afipReintentos: { gte: MAX_REINTENTOS } },
    });
    if (maxReintentos > 0 && admin) {
      await crearAlerta({
        tipo: "SISTEMA",
        prioridad: "ALTA",
        titulo: `${maxReintentos} factura(s) sin CAE tras ${MAX_REINTENTOS} reintentos`,
        mensaje: "Revisar manualmente las facturas pendientes de CAE en AFIP",
        modulo: "facturacion",
        usuarioId: admin.id,
      });
    }

    return NextResponse.json({
      data: {
        facturas: { pendientes: facturasPendientes.length, resueltas: facturasResueltas, fallidas: facturasFallidas },
        notasCredito: { pendientes: ncPendientes.length, resueltas: ncResueltas, fallidas: ncFallidas },
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Cron reintentar-cae] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
