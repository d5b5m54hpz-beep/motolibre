import { getCuentaPorCodigo, crearAsiento, CUENTAS } from "@/lib/contabilidad-utils";
import { categoriaToCuentaContable } from "@/lib/gastos-utils";
import { prisma } from "@/lib/prisma";
import type { BusinessEventData } from "../event-bus";

// ═══════════════════════════════════════════════════════════════
// HANDLER 1 — COBRO DE ALQUILER (commercial.payment.approve)
// Cuando MP confirma un pago → asiento de ingreso
// ═══════════════════════════════════════════════════════════════
export async function handlePaymentApprove(event: BusinessEventData) {
  try {
    const pago = await prisma.pagoMercadoPago.findUnique({
      where: { id: event.entityId },
    });
    if (!pago || pago.estado !== "APROBADO") return;

    const monto = Number(pago.monto);
    // Descomponer IVA (21%)
    const montoNeto = Math.round((monto / 1.21) * 100) / 100;
    const montoIva = Math.round((monto - montoNeto) * 100) / 100;

    const ctaMP = await getCuentaPorCodigo(CUENTAS.BANCO_MP);
    const ctaIngresos = await getCuentaPorCodigo(CUENTAS.INGRESOS_ALQUILER);
    const ctaIvaDF = await getCuentaPorCodigo(CUENTAS.IVA_DF);

    await crearAsiento({
      fecha: pago.fechaPago || new Date(),
      tipo: "VENTA",
      descripcion: `Cobro alquiler — Pago MP #${pago.mpPaymentId || pago.id}`,
      lineas: [
        { cuentaId: ctaMP.id, debe: monto, haber: 0, descripcion: "Ingreso MercadoPago" },
        { cuentaId: ctaIngresos.id, debe: 0, haber: montoNeto, descripcion: "Ingreso neto alquiler" },
        { cuentaId: ctaIvaDF.id, debe: 0, haber: montoIva, descripcion: "IVA Débito Fiscal 21%" },
      ],
      origenTipo: "PagoMercadoPago",
      origenId: pago.id,
      eventoId: event.entityId,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento COBRO creado — $${monto}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler payment.approve:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 2 — REFUND (commercial.payment.refund)
// Cuando se devuelve un pago → asiento inverso
// ═══════════════════════════════════════════════════════════════
export async function handlePaymentRefund(event: BusinessEventData) {
  try {
    const pago = await prisma.pagoMercadoPago.findUnique({
      where: { id: event.entityId },
    });
    if (!pago) return;

    const monto = Number(pago.monto);
    const montoNeto = Math.round((monto / 1.21) * 100) / 100;
    const montoIva = Math.round((monto - montoNeto) * 100) / 100;

    const ctaMP = await getCuentaPorCodigo(CUENTAS.BANCO_MP);
    const ctaIngresos = await getCuentaPorCodigo(CUENTAS.INGRESOS_ALQUILER);
    const ctaIvaDF = await getCuentaPorCodigo(CUENTAS.IVA_DF);

    await crearAsiento({
      fecha: new Date(),
      tipo: "AJUSTE",
      descripcion: `Devolución de pago — MP #${pago.mpPaymentId || pago.id}`,
      lineas: [
        { cuentaId: ctaIngresos.id, debe: montoNeto, haber: 0, descripcion: "Reverso ingreso alquiler" },
        { cuentaId: ctaIvaDF.id, debe: montoIva, haber: 0, descripcion: "Reverso IVA DF" },
        { cuentaId: ctaMP.id, debe: 0, haber: monto, descripcion: "Salida MercadoPago (refund)" },
      ],
      origenTipo: "PagoMercadoPago",
      origenId: pago.id,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento REFUND creado — $${monto}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler payment.refund:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 3/4 — FACTURA EMITIDA (invoicing.invoice.create)
// Tipo A: discrimina IVA. Tipo B: IVA incluido.
// ═══════════════════════════════════════════════════════════════
export async function handleInvoiceCreate(event: BusinessEventData) {
  try {
    const factura = await prisma.factura.findUnique({
      where: { id: event.entityId },
    });
    if (!factura) return;

    const ctaCobrar = await getCuentaPorCodigo(CUENTAS.CUENTAS_COBRAR);
    const ctaIngresos = await getCuentaPorCodigo(CUENTAS.INGRESOS_ALQUILER);

    const lineas: Array<{ cuentaId: string; debe: number; haber: number; descripcion?: string }> = [];

    // DEBE: Cuentas por Cobrar (total)
    lineas.push({
      cuentaId: ctaCobrar.id,
      debe: Number(factura.montoTotal),
      haber: 0,
      descripcion: `${factura.receptorNombre} — Factura ${factura.numeroCompleto}`,
    });

    if (factura.tipo === "A" && Number(factura.montoIva) > 0) {
      // HABER: Ingresos (neto) + IVA DF
      const ctaIvaDF = await getCuentaPorCodigo(CUENTAS.IVA_DF);
      lineas.push({
        cuentaId: ctaIngresos.id,
        debe: 0,
        haber: Number(factura.montoNeto),
        descripcion: "Ingreso neto",
      });
      lineas.push({
        cuentaId: ctaIvaDF.id,
        debe: 0,
        haber: Number(factura.montoIva),
        descripcion: "IVA Débito Fiscal 21%",
      });
    } else {
      // Tipo B: HABER solo Ingresos (total)
      lineas.push({
        cuentaId: ctaIngresos.id,
        debe: 0,
        haber: Number(factura.montoTotal),
        descripcion: "Ingreso (IVA incluido)",
      });
    }

    await crearAsiento({
      fecha: factura.fechaEmision,
      tipo: "VENTA",
      descripcion: `Factura ${factura.tipo} ${factura.numeroCompleto} — ${factura.receptorNombre}`,
      lineas,
      origenTipo: "Factura",
      origenId: factura.id,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento FACTURA ${factura.tipo} creado — ${factura.numeroCompleto}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler invoice.create:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 5 — ANULACIÓN DE FACTURA (invoicing.invoice.void)
// Asiento inverso de la factura
// ═══════════════════════════════════════════════════════════════
export async function handleInvoiceVoid(event: BusinessEventData) {
  try {
    const factura = await prisma.factura.findUnique({
      where: { id: event.entityId },
    });
    if (!factura) return;

    const ctaCobrar = await getCuentaPorCodigo(CUENTAS.CUENTAS_COBRAR);
    const ctaIngresos = await getCuentaPorCodigo(CUENTAS.INGRESOS_ALQUILER);

    const lineas: Array<{ cuentaId: string; debe: number; haber: number; descripcion?: string }> = [];

    if (factura.tipo === "A" && Number(factura.montoIva) > 0) {
      const ctaIvaDF = await getCuentaPorCodigo(CUENTAS.IVA_DF);
      lineas.push({ cuentaId: ctaIngresos.id, debe: Number(factura.montoNeto), haber: 0, descripcion: "Reverso ingreso" });
      lineas.push({ cuentaId: ctaIvaDF.id, debe: Number(factura.montoIva), haber: 0, descripcion: "Reverso IVA DF" });
    } else {
      lineas.push({ cuentaId: ctaIngresos.id, debe: Number(factura.montoTotal), haber: 0, descripcion: "Reverso ingreso" });
    }

    lineas.push({
      cuentaId: ctaCobrar.id,
      debe: 0,
      haber: Number(factura.montoTotal),
      descripcion: `Anulación Factura ${factura.numeroCompleto}`,
    });

    await crearAsiento({
      fecha: new Date(),
      tipo: "AJUSTE",
      descripcion: `Anulación Factura ${factura.tipo} ${factura.numeroCompleto}`,
      lineas,
      origenTipo: "Factura",
      origenId: factura.id,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento ANULACIÓN creado — ${factura.numeroCompleto}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler invoice.void:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 6 — ALTA DE MOTO (fleet.moto.create)
// Moto = Bien de Uso = Activo Fijo
// ═══════════════════════════════════════════════════════════════
export async function handleMotoCreate(event: BusinessEventData) {
  try {
    const moto = await prisma.moto.findUnique({ where: { id: event.entityId } });
    if (!moto) return;

    const precioCompra = Number(moto.precioCompra || 0);
    if (precioCompra <= 0) return; // Sin precio, no hay asiento

    // Descomponer IVA
    const montoNeto = Math.round((precioCompra / 1.21) * 100) / 100;
    const montoIva = Math.round((precioCompra - montoNeto) * 100) / 100;

    const ctaMotos = await getCuentaPorCodigo(CUENTAS.MOTOS);
    const ctaIvaCF = await getCuentaPorCodigo(CUENTAS.IVA_CF);
    const ctaProveedores = await getCuentaPorCodigo(CUENTAS.PROVEEDORES);

    await crearAsiento({
      fecha: moto.fechaCompra || new Date(),
      tipo: "COMPRA",
      descripcion: `Alta moto ${moto.marca} ${moto.modelo} — ${moto.patente || "Sin patente"}`,
      lineas: [
        { cuentaId: ctaMotos.id, debe: montoNeto, haber: 0, descripcion: `Bien de Uso — ${moto.marca} ${moto.modelo}` },
        { cuentaId: ctaIvaCF.id, debe: montoIva, haber: 0, descripcion: "IVA Crédito Fiscal" },
        { cuentaId: ctaProveedores.id, debe: 0, haber: precioCompra, descripcion: "Proveedor de moto" },
      ],
      origenTipo: "Moto",
      origenId: moto.id,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento ALTA MOTO creado — ${moto.marca} ${moto.modelo} $${precioCompra}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler moto.create:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 7 — DEPRECIACIÓN MENSUAL (fleet.moto.depreciation)
// Amortización lineal mensual de motos
// ═══════════════════════════════════════════════════════════════
export async function handleMotoDepreciation(event: BusinessEventData) {
  try {
    const monto = Number((event.payload as Record<string, unknown>)?.monto || 0);
    const motoId = (event.payload as Record<string, unknown>)?.motoId as string || event.entityId;

    if (monto <= 0) return;

    const moto = await prisma.moto.findUnique({ where: { id: motoId } });
    const descripcionMoto = moto ? `${moto.marca} ${moto.modelo} (${moto.patente || "s/p"})` : motoId;

    const ctaAmortGasto = await getCuentaPorCodigo(CUENTAS.COSTO_DEPRECIACION);
    const ctaAmortAcum = await getCuentaPorCodigo(CUENTAS.AMORT_ACUM_MOTOS);

    await crearAsiento({
      fecha: new Date(),
      tipo: "DEPRECIACION",
      descripcion: `Amortización mensual — ${descripcionMoto}`,
      lineas: [
        { cuentaId: ctaAmortGasto.id, debe: monto, haber: 0, descripcion: `Amortización ${descripcionMoto}` },
        { cuentaId: ctaAmortAcum.id, debe: 0, haber: monto, descripcion: `Amort. acumulada ${descripcionMoto}` },
      ],
      origenTipo: "Moto",
      origenId: motoId,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento DEPRECIACION creado — ${descripcionMoto} $${monto}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler depreciation:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 8 — GASTO OPERATIVO (finance.expense.create)
// ═══════════════════════════════════════════════════════════════
export async function handleExpenseCreate(event: BusinessEventData) {
  try {
    const meta = event.payload as Record<string, unknown> | undefined;
    const monto = Number(meta?.monto || 0);
    if (monto <= 0) return;

    const categoriaCuenta = (meta?.cuentaContable as string) || CUENTAS.GASTOS_ADMINISTRATIVOS;
    const medioPago = (meta?.medioPago as string) || "CAJA";

    const ctaGasto = await getCuentaPorCodigo(categoriaCuenta);
    const ctaPago = await getCuentaPorCodigo(
      medioPago === "MP" ? CUENTAS.BANCO_MP : CUENTAS.CAJA
    );

    await crearAsiento({
      fecha: new Date(),
      tipo: "GASTO",
      descripcion: (meta?.descripcion as string) || `Gasto operativo — ${ctaGasto.nombre}`,
      lineas: [
        { cuentaId: ctaGasto.id, debe: monto, haber: 0, descripcion: meta?.descripcion as string },
        { cuentaId: ctaPago.id, debe: 0, haber: monto, descripcion: `Pago ${medioPago}` },
      ],
      origenTipo: "Gasto",
      origenId: event.entityId,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento GASTO creado — $${monto}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler expense.create:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLERS 9-13, 15-16 — STUBS
// Se completan cuando se implementen las entidades en F3/F6
// ═══════════════════════════════════════════════════════════════

// 9. Ajuste de inventario
export async function handleInventoryAdjust(event: BusinessEventData) {
  try {
    console.log(`[Contabilidad] Stub: inventory.adjust — ${event.entityId}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler inventory.adjust:", error);
  }
}

// 10. Recepción de repuestos
export async function handleInventoryReception(event: BusinessEventData) {
  try {
    console.log(`[Contabilidad] Stub: inventory.reception — ${event.entityId}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler inventory.reception:", error);
  }
}

// 11. Confirmación costos importación
// DEBE: Mercadería en Tránsito  |  HABER: Proveedores Exterior
// Monto: totalFOB × tipoCambio
export async function handleImportConfirmCosts(event: BusinessEventData) {
  try {
    const meta = event.payload as Record<string, unknown> | undefined;
    const totalFOB = Number(meta?.totalFOB || 0);
    const tipoCambio = Number(meta?.tipoCambio || 0);
    if (totalFOB <= 0 || tipoCambio <= 0) return;

    const monto = Math.round(totalFOB * tipoCambio * 100) / 100;

    const ctaMercTransito = await getCuentaPorCodigo(CUENTAS.MERC_EN_TRANSITO);
    const ctaProvExterior = await getCuentaPorCodigo(CUENTAS.PROVEEDORES_EXTERIOR);

    await crearAsiento({
      fecha: new Date(),
      tipo: "COMPRA",
      descripcion: `Confirmación costos importación — Embarque ${event.entityId}`,
      lineas: [
        { cuentaId: ctaMercTransito.id, debe: monto, haber: 0, descripcion: "Mercadería en tránsito (FOB × TC)" },
        { cuentaId: ctaProvExterior.id, debe: 0, haber: monto, descripcion: "Deuda proveedor exterior" },
      ],
      origenTipo: "EmbarqueImportacion",
      origenId: event.entityId,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento IMPORT CONFIRM COSTS creado — $${monto}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler import.confirm_costs:", error);
  }
}

// 12. Despacho aduanero
// DEBE: Mercadería en Tránsito (costos de despacho sin IVA)
// DEBE: IVA Crédito Fiscal (IVA importación + IVA adicional)
// HABER: Caja/Banco (total pagado en despacho)
export async function handleImportDispatch(event: BusinessEventData) {
  try {
    const meta = event.payload as Record<string, unknown> | undefined;
    const derechosImp = Number(meta?.derechosImportacion || 0);
    const tasaEst = Number(meta?.tasaEstadistica || 0);
    const ivaImp = Number(meta?.ivaImportacion || 0);
    const ivaAdicional = Number(meta?.ivaAdicional || 0);
    const iibb = Number(meta?.ingresosBrutos || 0);
    const gastosVarios = Number(meta?.gastosVarios || 0);

    const totalDespacho = derechosImp + tasaEst + ivaImp + ivaAdicional + iibb + gastosVarios;
    if (totalDespacho <= 0) return;

    const costosSinIva = derechosImp + tasaEst + iibb + gastosVarios;
    const totalIva = ivaImp + ivaAdicional;

    const ctaMercTransito = await getCuentaPorCodigo(CUENTAS.MERC_EN_TRANSITO);
    const ctaIvaCF = await getCuentaPorCodigo(CUENTAS.IVA_CF);
    const ctaCaja = await getCuentaPorCodigo(CUENTAS.CAJA);

    const lineas: Array<{ cuentaId: string; debe: number; haber: number; descripcion?: string }> = [];

    if (costosSinIva > 0) {
      lineas.push({
        cuentaId: ctaMercTransito.id,
        debe: costosSinIva,
        haber: 0,
        descripcion: "Costos despacho (derechos + tasa + IIBB + gastos)",
      });
    }
    if (totalIva > 0) {
      lineas.push({
        cuentaId: ctaIvaCF.id,
        debe: totalIva,
        haber: 0,
        descripcion: "IVA importación + IVA adicional (CF)",
      });
    }
    lineas.push({
      cuentaId: ctaCaja.id,
      debe: 0,
      haber: totalDespacho,
      descripcion: "Pago despacho aduanero",
    });

    await crearAsiento({
      fecha: new Date(),
      tipo: "COMPRA",
      descripcion: `Despacho aduanero — Embarque ${event.entityId}`,
      lineas,
      origenTipo: "EmbarqueImportacion",
      origenId: event.entityId,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento IMPORT DISPATCH creado — $${totalDespacho}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler import.dispatch:", error);
  }
}

// 13. Recepción de importación
// DEBE: Inventario Repuestos (o Bienes de Uso si es moto)
// HABER: Mercadería en Tránsito
// Monto: costoNacionalizado de los items recibidos
export async function handleImportReception(event: BusinessEventData) {
  try {
    const meta = event.payload as Record<string, unknown> | undefined;
    const costoTotalRecibido = Number(meta?.costoTotalRecibido || 0);
    if (costoTotalRecibido <= 0) return;

    const ctaInventario = await getCuentaPorCodigo(CUENTAS.INVENTARIO_REPUESTOS);
    const ctaMercTransito = await getCuentaPorCodigo(CUENTAS.MERC_EN_TRANSITO);

    await crearAsiento({
      fecha: new Date(),
      tipo: "COMPRA",
      descripcion: `Recepción importación — Embarque ${event.entityId}`,
      lineas: [
        { cuentaId: ctaInventario.id, debe: costoTotalRecibido, haber: 0, descripcion: "Ingreso a inventario" },
        { cuentaId: ctaMercTransito.id, debe: 0, haber: costoTotalRecibido, descripcion: "Baja merc. en tránsito" },
      ],
      origenTipo: "EmbarqueImportacion",
      origenId: event.entityId,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento IMPORT RECEPTION creado — $${costoTotalRecibido}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler import.reception:", error);
  }
}

// 14. Orden de trabajo completada
export async function handleWorkorderComplete(event: BusinessEventData) {
  try {
    const meta = event.payload as Record<string, unknown> | undefined;
    const costoTotal = Number(meta?.costoTotal || 0);
    if (costoTotal <= 0) return;

    // Intentar desglose detallado desde ItemOT
    const items = await prisma.itemOT.findMany({
      where: { ordenTrabajoId: event.entityId },
    });

    const ctaMant = await getCuentaPorCodigo(CUENTAS.GASTOS_MANTENIMIENTO);

    const lineas: Array<{ cuentaId: string; debe: number; haber: number; descripcion?: string }> = [];

    if (items.length > 0) {
      // Desglose detallado por tipo de item
      const costoManoObra = items
        .filter((i) => i.tipo === "MANO_OBRA")
        .reduce((sum, i) => sum + Number(i.subtotal), 0);
      const costoRepuestos = items
        .filter((i) => i.tipo === "REPUESTO")
        .reduce((sum, i) => sum + Number(i.subtotal), 0);
      const costoInsumos = items
        .filter((i) => i.tipo === "INSUMO")
        .reduce((sum, i) => sum + Number(i.subtotal), 0);

      const total = costoManoObra + costoRepuestos + costoInsumos;
      if (total <= 0) return;

      // DEBE: Gastos de Mantenimiento por cada componente
      if (costoManoObra > 0) {
        lineas.push({
          cuentaId: ctaMant.id,
          debe: costoManoObra,
          haber: 0,
          descripcion: "Mano de obra — OT",
        });
      }
      if (costoRepuestos > 0) {
        lineas.push({
          cuentaId: ctaMant.id,
          debe: costoRepuestos,
          haber: 0,
          descripcion: "Repuestos — OT",
        });
      }
      if (costoInsumos > 0) {
        lineas.push({
          cuentaId: ctaMant.id,
          debe: costoInsumos,
          haber: 0,
          descripcion: "Insumos — OT",
        });
      }

      // HABER: Repuestos desde inventario, el resto desde caja/proveedores
      if (costoRepuestos > 0) {
        const ctaInvRepuestos = await getCuentaPorCodigo(CUENTAS.INVENTARIO_REPUESTOS);
        lineas.push({
          cuentaId: ctaInvRepuestos.id,
          debe: 0,
          haber: costoRepuestos,
          descripcion: "Baja stock repuestos",
        });
      }
      const costoNonRepuesto = costoManoObra + costoInsumos;
      if (costoNonRepuesto > 0) {
        const ctaCaja = await getCuentaPorCodigo(CUENTAS.CAJA);
        lineas.push({
          cuentaId: ctaCaja.id,
          debe: 0,
          haber: costoNonRepuesto,
          descripcion: "Pago mano de obra + insumos",
        });
      }
    } else {
      // Legacy: sin ItemOT, asiento simple
      const ctaCaja = await getCuentaPorCodigo(CUENTAS.CAJA);
      lineas.push({
        cuentaId: ctaMant.id,
        debe: costoTotal,
        haber: 0,
        descripcion: "Costo mantenimiento",
      });
      lineas.push({
        cuentaId: ctaCaja.id,
        debe: 0,
        haber: costoTotal,
        descripcion: "Pago mantenimiento",
      });
    }

    if (lineas.length < 2) return;

    const asiento = await crearAsiento({
      fecha: new Date(),
      tipo: "GASTO",
      descripcion: `Mantenimiento completado — OT ${event.entityId}`,
      lineas,
      origenTipo: "OrdenTrabajo",
      origenId: event.entityId,
      userId: event.userId ?? "system",
    });

    // Vincular asiento a la OT
    await prisma.ordenTrabajo.update({
      where: { id: event.entityId },
      data: { asientoId: asiento.id.toString() },
    });

    console.log(`[Contabilidad] Asiento MANTENIMIENTO creado — $${costoTotal} (${items.length} items)`);
  } catch (error) {
    console.error("[Contabilidad] Error handler workorder.complete:", error);
  }
}

// 15. Nota de crédito
export async function handleCreditNoteCreate(event: BusinessEventData) {
  try {
    const nc = await prisma.notaCredito.findUnique({
      where: { id: event.entityId },
    });
    if (!nc) return;

    const ctaCobrar = await getCuentaPorCodigo(CUENTAS.CUENTAS_COBRAR);
    const ctaIngresos = await getCuentaPorCodigo(CUENTAS.INGRESOS_ALQUILER);

    const lineas: Array<{ cuentaId: string; debe: number; haber: number; descripcion?: string }> = [];

    if (Number(nc.montoIva) > 0) {
      const ctaIvaDF = await getCuentaPorCodigo(CUENTAS.IVA_DF);
      lineas.push({ cuentaId: ctaIngresos.id, debe: Number(nc.montoNeto), haber: 0, descripcion: "Reverso ingreso (NC)" });
      lineas.push({ cuentaId: ctaIvaDF.id, debe: Number(nc.montoIva), haber: 0, descripcion: "Reverso IVA DF (NC)" });
    } else {
      lineas.push({ cuentaId: ctaIngresos.id, debe: Number(nc.montoTotal), haber: 0, descripcion: "Reverso ingreso (NC)" });
    }

    lineas.push({
      cuentaId: ctaCobrar.id,
      debe: 0,
      haber: Number(nc.montoTotal),
      descripcion: `NC ${nc.numeroCompleto} — ${nc.receptorNombre}`,
    });

    await crearAsiento({
      fecha: nc.fechaEmision,
      tipo: "AJUSTE",
      descripcion: `Nota de crédito ${nc.numeroCompleto} — ${nc.motivo}`,
      lineas,
      origenTipo: "NotaCredito",
      origenId: nc.id,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento NC creado — ${nc.numeroCompleto}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler credit_note.create:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 16 — CONCILIACIÓN BANCARIA (finance.bankReconciliation.approve)
// Si hay diferencia entre banco y sistema, genera asiento de ajuste
// ═══════════════════════════════════════════════════════════════
export async function handleReconciliation(event: BusinessEventData) {
  try {
    const conciliacion = await prisma.conciliacion.findUnique({
      where: { id: event.entityId },
      include: { cuentaBancaria: true },
    });
    if (!conciliacion) return;

    const diferencia = Number(conciliacion.diferencia ?? 0);
    if (Math.abs(diferencia) < 0.01) {
      console.log(`[Contabilidad] Conciliación ${conciliacion.numero} — sin diferencia`);
      return;
    }

    const cuentaContableId = conciliacion.cuentaBancaria.cuentaContableId;
    if (!cuentaContableId) {
      console.log(`[Contabilidad] Conciliación ${conciliacion.numero} — cuenta bancaria sin cuenta contable`);
      return;
    }

    const ctaBanco = await prisma.cuentaContable.findUnique({ where: { id: cuentaContableId } });
    if (!ctaBanco) return;

    const ctaDiferencias = await getCuentaPorCodigo(CUENTAS.DIFERENCIAS_CONCILIACION);

    // Si diferencia > 0: banco tiene más que el sistema
    //   DEBE: Banco, HABER: Diferencias de Conciliación
    // Si diferencia < 0: sistema tiene más que el banco
    //   DEBE: Diferencias de Conciliación, HABER: Banco
    const abs = Math.abs(diferencia);
    const lineas =
      diferencia > 0
        ? [
            { cuentaId: ctaBanco.id, debe: abs, haber: 0, descripcion: "Ajuste conciliación (banco > libros)" },
            { cuentaId: ctaDiferencias.id, debe: 0, haber: abs, descripcion: "Diferencia de conciliación bancaria" },
          ]
        : [
            { cuentaId: ctaDiferencias.id, debe: abs, haber: 0, descripcion: "Diferencia de conciliación bancaria" },
            { cuentaId: ctaBanco.id, debe: 0, haber: abs, descripcion: "Ajuste conciliación (libros > banco)" },
          ];

    await crearAsiento({
      fecha: new Date(),
      tipo: "CONCILIACION",
      descripcion: `Ajuste conciliación bancaria — ${conciliacion.cuentaBancaria.nombre} — ${conciliacion.numero}`,
      lineas,
      origenTipo: "Conciliacion",
      origenId: conciliacion.id,
      userId: event.userId ?? "system",
    });

    console.log(`[Contabilidad] Asiento CONCILIACIÓN creado — diferencia $${diferencia}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler reconciliation:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 17 — FACTURA DE COMPRA (invoicing.purchaseInvoice.create)
// Registra la deuda con el proveedor
// ═══════════════════════════════════════════════════════════════
export async function handlePurchaseInvoiceCreate(event: BusinessEventData) {
  try {
    const fc = await prisma.facturaCompra.findUnique({
      where: { id: event.entityId },
    });
    if (!fc) return;

    const ctaProveedores = await getCuentaPorCodigo(CUENTAS.PROVEEDORES);
    const lineas: Array<{ cuentaId: string; debe: number; haber: number; descripcion?: string }> = [];

    if (fc.tipo === "A" && Number(fc.montoIva) > 0) {
      const ctaIvaCF = await getCuentaPorCodigo(CUENTAS.IVA_CF);
      const cuentaGasto = fc.categoria
        ? await getCuentaPorCodigo(categoriaToCuentaContable(fc.categoria))
        : await getCuentaPorCodigo(CUENTAS.GASTOS_ADMINISTRATIVOS);

      lineas.push({ cuentaId: cuentaGasto.id, debe: Number(fc.montoNeto), haber: 0, descripcion: fc.concepto });
      lineas.push({ cuentaId: ctaIvaCF.id, debe: Number(fc.montoIva), haber: 0, descripcion: "IVA CF 21%" });
    } else {
      const cuentaGasto = fc.categoria
        ? await getCuentaPorCodigo(categoriaToCuentaContable(fc.categoria))
        : await getCuentaPorCodigo(CUENTAS.GASTOS_ADMINISTRATIVOS);

      lineas.push({ cuentaId: cuentaGasto.id, debe: Number(fc.montoTotal), haber: 0, descripcion: fc.concepto });
    }

    lineas.push({
      cuentaId: ctaProveedores.id,
      debe: 0,
      haber: Number(fc.montoTotal),
      descripcion: `${fc.proveedorNombre} — ${fc.numeroCompleto}`,
    });

    await crearAsiento({
      fecha: fc.fechaEmision,
      tipo: "COMPRA",
      descripcion: `Factura compra ${fc.tipo} ${fc.numeroCompleto} — ${fc.proveedorNombre}`,
      lineas,
      origenTipo: "FacturaCompra",
      origenId: fc.id,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento FC COMPRA creado — ${fc.numeroCompleto}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler purchase_invoice.create:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 18 — PAGO FACTURA COMPRA (invoicing.purchaseInvoice.approve)
// Registra el pago al proveedor
// ═══════════════════════════════════════════════════════════════
export async function handlePurchaseInvoicePay(event: BusinessEventData) {
  try {
    const meta = event.payload as Record<string, unknown> | undefined;
    const monto = Number(meta?.monto || 0);
    if (monto <= 0) return;

    const cuentaPago = (meta?.cuentaPago as string) || CUENTAS.CAJA;
    const ctaProveedores = await getCuentaPorCodigo(CUENTAS.PROVEEDORES);
    const ctaPago = await getCuentaPorCodigo(cuentaPago);

    await crearAsiento({
      fecha: new Date(),
      tipo: "COMPRA",
      descripcion: `Pago a proveedor — ${meta?.proveedorNombre || ""} ${meta?.numeroCompleto || ""}`,
      lineas: [
        { cuentaId: ctaProveedores.id, debe: monto, haber: 0, descripcion: "Cancelación deuda proveedor" },
        { cuentaId: ctaPago.id, debe: 0, haber: monto, descripcion: `Pago ${cuentaPago === CUENTAS.BANCO_MP ? "MercadoPago" : "Caja"}` },
      ],
      origenTipo: "FacturaCompra",
      origenId: event.entityId,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento PAGO FC creado — $${monto}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler purchase_invoice.pay:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 19 — LIQUIDACIÓN NÓMINA (hr.payroll.liquidate)
// Al liquidar sueldo → asiento de gasto de personal
// DEBE: Sueldos y Jornales (totalHaberes) + Cargas Sociales (totalContribuciones)
// HABER: Sueldos a Pagar (netoAPagar) + Retenciones (totalDeducciones) + Contribuciones (totalContribuciones)
// ═══════════════════════════════════════════════════════════════
export async function handlePayrollLiquidate(event: BusinessEventData) {
  try {
    const recibo = await prisma.reciboSueldo.findUnique({
      where: { id: event.entityId },
      include: { empleado: { select: { nombre: true, apellido: true, legajo: true } } },
    });
    if (!recibo) return;

    const totalHaberes = Number(recibo.totalHaberes);
    const totalDeducciones = Number(recibo.totalDeducciones);
    const netoAPagar = Number(recibo.netoAPagar);
    const totalContribuciones = Number(recibo.totalContribuciones);

    if (totalHaberes <= 0) return;

    const ctaSueldos = await getCuentaPorCodigo(CUENTAS.GASTOS_SUELDOS);
    const ctaCargasSociales = await getCuentaPorCodigo(CUENTAS.GASTOS_CARGAS_SOCIALES);
    const ctaSueldosAPagar = await getCuentaPorCodigo(CUENTAS.SUELDOS_A_PAGAR);
    const ctaRetenciones = await getCuentaPorCodigo(CUENTAS.RETENCIONES_A_DEPOSITAR);
    const ctaContribuciones = await getCuentaPorCodigo(CUENTAS.CONTRIBUCIONES_A_DEPOSITAR);

    const desc = `Liquidación ${recibo.periodo} — ${recibo.empleado.legajo} ${recibo.empleado.apellido}`;

    await crearAsiento({
      fecha: recibo.fechaLiquidacion || new Date(),
      tipo: "GASTO",
      descripcion: desc,
      lineas: [
        { cuentaId: ctaSueldos.id, debe: totalHaberes, haber: 0, descripcion: "Sueldos y Jornales" },
        { cuentaId: ctaCargasSociales.id, debe: totalContribuciones, haber: 0, descripcion: "Cargas Sociales Empleador" },
        { cuentaId: ctaSueldosAPagar.id, debe: 0, haber: netoAPagar, descripcion: "Neto a pagar al empleado" },
        { cuentaId: ctaRetenciones.id, debe: 0, haber: totalDeducciones, descripcion: "Retenciones empleado (Jub+OS+PAMI)" },
        { cuentaId: ctaContribuciones.id, debe: 0, haber: totalContribuciones, descripcion: "Contribuciones patronales" },
      ],
      origenTipo: "ReciboSueldo",
      origenId: recibo.id,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento NÓMINA creado — ${desc} — Neto $${netoAPagar}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler payroll.liquidate:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER 20 — VENTA REPUESTOS (sale.confirm)
// Cuando se confirma pago de un pedido de repuestos
// ═══════════════════════════════════════════════════════════════
export async function handleSaleConfirm(event: BusinessEventData) {
  try {
    const orden = await prisma.ordenVentaRepuesto.findUnique({
      where: { id: event.entityId },
      include: {
        items: {
          include: { repuesto: { select: { precioCompra: true } } },
        },
      },
    });
    if (!orden || orden.estado === "CANCELADA") return;

    const total = Number(orden.total);
    const neto = Math.round((total / 1.21) * 100) / 100;
    const iva = Math.round((total - neto) * 100) / 100;

    // Costo de mercadería vendida
    const costoTotal = orden.items.reduce(
      (sum, item) => sum + Number(item.repuesto.precioCompra) * item.cantidad,
      0
    );

    const ctaMP = await getCuentaPorCodigo(CUENTAS.BANCO_MP);
    const ctaVentas = await getCuentaPorCodigo(CUENTAS.INGRESOS_REPUESTOS);
    const ctaIvaDF = await getCuentaPorCodigo(CUENTAS.IVA_DF);
    const ctaCMV = await getCuentaPorCodigo(CUENTAS.COSTO_VENTA_REPUESTOS);
    const ctaInventario = await getCuentaPorCodigo(CUENTAS.INVENTARIO_REPUESTOS);

    const lineas = [
      { cuentaId: ctaMP.id, debe: total, haber: 0, descripcion: "Ingreso MercadoPago" },
      { cuentaId: ctaVentas.id, debe: 0, haber: neto, descripcion: "Venta repuestos" },
      { cuentaId: ctaIvaDF.id, debe: 0, haber: iva, descripcion: "IVA Débito Fiscal 21%" },
    ];

    if (costoTotal > 0) {
      lineas.push(
        { cuentaId: ctaCMV.id, debe: costoTotal, haber: 0, descripcion: "CMV Repuestos" },
        { cuentaId: ctaInventario.id, debe: 0, haber: costoTotal, descripcion: "Baja inventario" },
      );
    }

    await crearAsiento({
      fecha: new Date(),
      tipo: "VENTA",
      descripcion: `Venta repuestos — Orden #${orden.numero}`,
      lineas,
      origenTipo: "OrdenVentaRepuesto",
      origenId: orden.id,
      eventoId: event.entityId,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento VENTA REPUESTOS creado — Orden #${orden.numero} — $${total}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler sale.confirm:", error);
  }
}
