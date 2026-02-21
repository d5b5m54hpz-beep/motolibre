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
export async function handleImportConfirmCosts(event: BusinessEventData) {
  try {
    console.log(`[Contabilidad] Stub: import.confirm_costs — ${event.entityId}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler import.confirm_costs:", error);
  }
}

// 12. Despacho aduanero
export async function handleImportDispatch(event: BusinessEventData) {
  try {
    console.log(`[Contabilidad] Stub: import.dispatch — ${event.entityId}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler import.dispatch:", error);
  }
}

// 13. Recepción de importación
export async function handleImportReception(event: BusinessEventData) {
  try {
    console.log(`[Contabilidad] Stub: import.reception — ${event.entityId}`);
  } catch (error) {
    console.error("[Contabilidad] Error handler import.reception:", error);
  }
}

// 14. Orden de trabajo completada
export async function handleWorkorderComplete(event: BusinessEventData) {
  try {
    const meta = event.payload as Record<string, unknown> | undefined;
    const monto = Number(meta?.costoTotal || 0);
    if (monto <= 0) return;

    const ctaMant = await getCuentaPorCodigo(CUENTAS.GASTOS_MANTENIMIENTO);
    const ctaCaja = await getCuentaPorCodigo(CUENTAS.CAJA);

    await crearAsiento({
      fecha: new Date(),
      tipo: "GASTO",
      descripcion: `Mantenimiento completado — OT ${event.entityId}`,
      lineas: [
        { cuentaId: ctaMant.id, debe: monto, haber: 0, descripcion: "Costo mantenimiento" },
        { cuentaId: ctaCaja.id, debe: 0, haber: monto, descripcion: "Pago mantenimiento" },
      ],
      origenTipo: "OrdenTrabajo",
      origenId: event.entityId,
      userId: "system",
    });

    console.log(`[Contabilidad] Asiento MANTENIMIENTO creado — $${monto}`);
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

// 16. Conciliación bancaria
export async function handleReconciliation(event: BusinessEventData) {
  try {
    console.log(`[Contabilidad] Stub: reconciliation.complete — ${event.entityId}`);
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
